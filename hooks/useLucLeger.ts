import { useState, useEffect, useRef, useCallback } from 'react';
import { LUC_LEGER_DATA, SHUTTLE_TIMELINE } from '../constants';
import type { TestState, StudentResult, LucLegerLevel, StudentIdentity, PhysicalTests } from '../types';
import { playBeep, playLevelUpChime, announcePalier, resetPalierAnnouncement } from '../utils/audioHelper';
import { getVmaResults, saveVmaResults, clearVmaResults, getPhysicalTests, savePhysicalTests } from '../utils/db';

export const useLucLeger = (
  className: string, 
  studentList: StudentIdentity[], 
  sessionDate?: string,
  language: 'ar' | 'fr' = 'ar'
) => {
  const [testState, setTestState] = useState<TestState>('idle');
  const [time, setTime] = useState(0);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [finishedStudents, setFinishedStudents] = useState<Set<string>>(new Set());

  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const lastAnnouncedPalierRef = useRef<number>(0);
  const lastBeepSegmentIndexRef = useRef<number>(-1);

  const currentLevelIndex = Math.floor(time / 60);
  const currentLevel: LucLegerLevel | null = LUC_LEGER_DATA[currentLevelIndex] || null;

  // Keep timeRef in sync with time state
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    if (className) {
        setTestState('idle');
        setTime(0);
        timeRef.current = 0;
        setFinishedStudents(new Set());
        getVmaResults(className).then(loadedResults => {
            setResults(loadedResults);
            const finished = new Set(loadedResults.map(r => String(r.numeroEleve)));
            setFinishedStudents(finished);
        });
    }
  }, [className]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (testState === 'running') {
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }

      // High-precision interval for continuous clock update and audio sync (20ms interval = 50Hz check)
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current === null) return;
        const now = performance.now();
        const elapsedSeconds = (now - startTimeRef.current) / 1000;
        const currentWholeSeconds = Math.floor(elapsedSeconds);

        if (currentWholeSeconds !== timeRef.current) {
          timeRef.current = currentWholeSeconds;
          setTime(currentWholeSeconds);
        }

        // Level Up Announcement (every 60s)
        if (currentWholeSeconds > 0 && currentWholeSeconds % 60 === 0) {
            const nextPalierNumber = Math.floor(currentWholeSeconds / 60) + 1;
            if (nextPalierNumber !== lastAnnouncedPalierRef.current && LUC_LEGER_DATA[nextPalierNumber - 1]) {
                lastAnnouncedPalierRef.current = nextPalierNumber;
                playLevelUpChime(audioContextRef.current);
                announcePalier(nextPalierNumber, language);
            }
        }

        // Check if we entered a new shuttle segment to trigger beep sound precisely
        const segmentIndex = SHUTTLE_TIMELINE.findIndex(
            s => elapsedSeconds >= s.startTime && elapsedSeconds < s.endTime
        );

        if (segmentIndex !== -1 && segmentIndex !== lastBeepSegmentIndexRef.current) {
            lastBeepSegmentIndexRef.current = segmentIndex;
            // Play beep at start of shuttle (which is also arrival at end of prior shuttle)
            playBeep(audioContextRef.current);
        }

        const currentLevelExists = LUC_LEGER_DATA[Math.floor(elapsedSeconds / 60)];
        if (!currentLevelExists) {
            setTestState('finished');
        }
      }, 20);
    } else {
      stopTimer();
    }
    
    return () => stopTimer();
  }, [testState, language, stopTimer]);

  const startTest = useCallback(() => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            alert("Votre navigateur ne supporte pas l'API Audio nécessaire pour les bips sonores.");
            return;
        }
    }
    
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    
    resetPalierAnnouncement();
    lastAnnouncedPalierRef.current = 1;
    lastBeepSegmentIndexRef.current = -1;
    timeRef.current = 0;
    setTime(0);
    startTimeRef.current = performance.now();
    
    // Play initial start beep & announcement
    playBeep(audioContextRef.current);
    lastBeepSegmentIndexRef.current = 0;
    announcePalier(1, language);

    setTestState('running');
  }, [language]);

  const stopTest = useCallback(() => {
    setTestState('finished');
  }, []);

  // Supprime TOUTES les données de la classe (Réinitialisation totale)
  const clearAllData = useCallback(async () => {
    stopTimer();
    setTestState('idle');
    setTime(0);
    setResults([]);
    setFinishedStudents(new Set());
    
    try {
      await clearVmaResults(className);

      // Clear VMA from physical tests for this class as well
      const currentPhys = await getPhysicalTests(className);
      if (currentPhys && currentPhys.length > 0) {
        const cleanedPhys = currentPhys.map(p => {
          const { vma, ...rest } = p;
          return rest as PhysicalTests;
        });
        await savePhysicalTests(className, cleanedPhys);
      }

      window.dispatchEvent(new CustomEvent('dbUpdated'));
    } catch (err) {
      console.error("Erreur lors de la suppression des résultats sauvegardés :", err);
    }
  }, [className, stopTimer]);

  // Réinitialise uniquement le chronomètre pour lancer un nouveau groupe (garde les résultats précédents)
  const prepareNextRun = useCallback(() => {
      stopTimer();
      setTestState('idle');
      setTime(0);
      // On ne vide ni results ni finishedStudents
  }, [stopTimer]);

  const recordStudentFinish = useCallback((studentId: string) => {
    if (testState !== 'running' || finishedStudents.has(studentId)) {
      return;
    }
    
    const studentInfo = studentList.find(s => s.numeroEleve === studentId);

    // Calculate exact elapsed seconds
    const now = performance.now();
    const elapsedSeconds = startTimeRef.current !== null ? (now - startTimeRef.current) / 1000 : timeRef.current;

    // Completed shuttle segments (must have ended before stop time)
    const completedSegments = SHUTTLE_TIMELINE.filter(s => s.endTime <= elapsedSeconds);
    const completedCount = completedSegments.length;

    let finalPalier = 1;
    let finalVma = 8.0;
    let finalVitesse = 8.0;

    if (completedCount > 0) {
      const lastCompleted = completedSegments[completedCount - 1];
      finalPalier = lastCompleted.palier;
      finalVma = lastCompleted.vitesse;
      finalVitesse = lastCompleted.vitesse;
    } else {
      finalPalier = 1;
      finalVma = 8.0;
      finalVitesse = 8.0;
    }

    // Distance calculation: completed shuttles (20m each) + partial distance in current uncompleted shuttle
    const completedDistance = completedCount * 20;

    const currentSegment = SHUTTLE_TIMELINE.find(
      s => elapsedSeconds >= s.startTime && elapsedSeconds < s.endTime
    );

    let partialDistance = 0;
    if (currentSegment) {
      const timeInCurrentShuttle = elapsedSeconds - currentSegment.startTime;
      const ratio = Math.min(Math.max(timeInCurrentShuttle / currentSegment.duration, 0), 1);
      partialDistance = ratio * 20;
    }

    const distanceParcourue = Math.round((completedDistance + partialDistance) * 10) / 10;

    // Use sessionDate if provided, otherwise current time
    let dateStr = new Date().toLocaleString('fr-FR');
    if (sessionDate) {
        const d = new Date(sessionDate);
        if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleString('fr-FR');
        }
    }

    const newResult: StudentResult = {
      id: Date.now(),
      numeroEleve: studentId,
      nomEleve: studentInfo?.nomEleve,
      sexe: studentInfo?.sexe,
      palierAtteint: finalPalier,
      vitesseMoyenne: finalVitesse,
      vma: finalVma,
      distanceParcourue,
      date: dateStr,
    };
    
    // To prevent duplicates in the local state, filter out any previous result for this student
    const otherResults = results.filter(r => r.numeroEleve !== studentId);
    const updatedResults = [...otherResults, newResult].sort((a,b) => {
        const na = parseInt(a.numeroEleve, 10);
        const nb = parseInt(b.numeroEleve, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.numeroEleve.localeCompare(b.numeroEleve);
    });

    setResults(updatedResults);
    setFinishedStudents(prev => new Set(prev).add(studentId));
    saveVmaResults(className, updatedResults);

    // Sync with physical tests table
    getPhysicalTests(className).then(currentPhys => {
      let found = false;
      const updatedPhys = currentPhys.map(p => {
        if (p.numeroEleve === studentId) {
          found = true;
          return {
            ...p,
            vma: finalVma,
            nomEleve: studentInfo?.nomEleve || p.nomEleve,
            sexe: studentInfo?.sexe || p.sexe
          };
        }
        return p;
      });

      if (!found) {
        updatedPhys.push({
          numeroEleve: studentId,
          nomEleve: studentInfo?.nomEleve,
          sexe: studentInfo?.sexe,
          vma: finalVma,
          date: dateStr
        });
      }

      savePhysicalTests(className, updatedPhys).then(() => {
        window.dispatchEvent(new CustomEvent('dbUpdated'));
      });
    }).catch(err => {
      console.error("Error syncing VMA to physical tests:", err);
    });

  }, [testState, finishedStudents, studentList, className, results, sessionDate]);

  // Undo a finish (e.g., if clicked by mistake or deleted from results)
  const undoStudentFinish = useCallback(async (studentId: string) => {
    const updatedResults = results.filter(r => r.numeroEleve !== studentId);
    setResults(updatedResults);
    
    setFinishedStudents(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
    });

    await saveVmaResults(className, updatedResults);

    try {
      const currentPhys = await getPhysicalTests(className);
      if (currentPhys && currentPhys.length > 0) {
        const updatedPhys = currentPhys.map(p => {
          if (p.numeroEleve === studentId) {
            const { vma, ...rest } = p;
            return rest as PhysicalTests;
          }
          return p;
        });
        await savePhysicalTests(className, updatedPhys);
      }
      window.dispatchEvent(new CustomEvent('dbUpdated'));
    } catch (err) {
      console.error("Error updating physical tests on undo:", err);
    }
  }, [results, className]);

  return {
    testState,
    time,
    currentLevel,
    finishedStudents,
    results,
    startTest,
    stopTest,
    clearAllData,
    prepareNextRun,
    recordStudentFinish,
    undoStudentFinish,
  };
};