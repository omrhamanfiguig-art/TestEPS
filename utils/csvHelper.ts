// Fix: Provide implementation for the CSV export utility.
import type { StudentResult, EnduranceResult, AffinityGroup } from '../types';

// Let TypeScript know that XLSX is a global variable from the script tag
declare const XLSX: any;

export const exportResultsToXLSX = (results: StudentResult[], className: string) => {
  if (results.length === 0) {
    alert("Aucun résultat à exporter.");
    return;
  }
  
  if (typeof XLSX === 'undefined') {
    alert("La librairie d'export Excel n'est pas chargée. Veuillez rafraîchir la page.");
    console.error("XLSX library is not available.");
    return;
  }

  const sheetData: (string | number)[][] = [
    ["N° Élève", "Nom Élève", "Sexe", "Palier Atteint", "Distance (m)", "VMA (km/h)", "Date"]
  ];

  results.forEach(result => {
    sheetData.push([
      result.numeroEleve,
      result.nomEleve || '',
      result.sexe || '',
      result.palierAtteint,
      result.distanceParcourue !== undefined ? result.distanceParcourue : '',
      result.vma,
      result.date
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 10 }, // N° Élève
    { wch: 25 }, // Nom Élève
    { wch: 8 },  // Sexe
    { wch: 15 }, // Palier Atteint
    { wch: 12 }, // VMA (km/h)
    { wch: 20 }, // Date
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Résultats Luc Léger");

  const safeClassName = className.replace(/\s+/g, '_');
  XLSX.writeFile(wb, `resultats_luc_leger_${safeClassName}.xlsx`);
};

export const exportResultsToCSV = (results: StudentResult[], className: string) => {
  if (results.length === 0) {
    alert("Aucun résultat à exporter.");
    return;
  }

  const headers = ['"Numéro Élève"', '"Nom Élève"', '"Sexe"', '"Palier Atteint"', '"Distance (m)"', '"VMA (km/h)"', '"Date"'];
  const csvRows = [headers.join(',')];

  results.forEach(result => {
    const row = [
      result.numeroEleve,
      `"${result.nomEleve || ''}"`,
      `"${result.sexe || ''}"`,
      result.palierAtteint,
      result.distanceParcourue !== undefined ? result.distanceParcourue : '',
      result.vma.toFixed(1),
      `"${result.date}"`
    ].join(',');
    csvRows.push(row);
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const safeClassName = className.replace(/\s+/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `resultats_luc_leger_${safeClassName}.csv`);
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};


export const exportEnduranceResultsToCSV = (results: EnduranceResult[], className: string) => {
    if (results.length === 0) {
      alert("Aucun résultat d'endurance à exporter.");
      return;
    }
  
    // Based on prompt: numéro, sexe (omitted), distance, temps, vitesse, groupe, VMA initiale.
    const headers = ['"Numéro Élève"', '"Nom Élève"', '"Groupe"', '"VMA Initiale (km/h)"', '"Distance (m)"', '"Temps"', '"Vitesse (km/h)"', '"Date"'];
    const csvRows = [headers.join(',')];
  
    results.forEach(result => {
      const minutes = Math.floor(result.tempsSecondes / 60);
      const seconds = Math.floor(result.tempsSecondes % 60);
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const row = [
        result.numeroEleve,
        `"${result.nomEleve || ''}"`,
        `"${result.groupName}"`,
        result.vma.toFixed(1),
        result.distance,
        `"${formattedTime}"`,
        result.vitesseMoyenneKmh.toFixed(2),
        `"${result.date}"`
      ].join(',');
      csvRows.push(row);
    });
  
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const safeClassName = className.replace(/\s+/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `resultats_endurance_${safeClassName}.csv`);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

export const exportGroupsToExcel = (groups: AffinityGroup[], className: string) => {
    const studentsInGroups = groups.flatMap(g => g.students);
    if (studentsInGroups.length === 0) {
        alert("Aucun groupe avec des élèves à exporter.");
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert("La librairie d'export Excel n'est pas chargée. Veuillez rafraîchir la page.");
        console.error("XLSX library is not available.");
        return;
    }

    const wb = XLSX.utils.book_new();

    groups.forEach(group => {
        if (group.students.length > 0) {
            const sheetData: (string | number)[][] = [
                [`Groupe: ${group.name}`],
                [`VMA Moyenne: ${group.vmaMoyenne.toFixed(2)} km/h`],
                [`Écart-type (الانحراف المعياري σ): ±${group.ecartType.toFixed(2)} km/h`],
                [`Plage VMA: ${group.vmaRange} km/h`],
                [`Coefficient de variation (CV): ${group.coefficientVariation ? group.coefficientVariation.toFixed(1) + '%' : 'N/A'}`],
                [], // Ligne vide
                ["N° Élève", "Nom", "Sexe", "VMA (km/h)", "Palier"]
            ];

            group.students.forEach(student => {
                sheetData.push([
                    student.numeroEleve,
                    student.nomEleve || '',
                    student.sexe || '',
                    student.vma,
                    student.palierAtteint
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            ws['!cols'] = [
                { wch: 10 },
                { wch: 25 },
                { wch: 8 },
                { wch: 12 },
                { wch: 8 },
            ];

            XLSX.utils.book_append_sheet(wb, ws, group.name.replace(/\s/g, ''));
        }
    });

    const safeClassName = className.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `groupes_affinite_vma_${safeClassName}.xlsx`);
};