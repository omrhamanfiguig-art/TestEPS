import type { StudentResult, AffinityGroup } from '../types';

/**
 * Calculates the standard deviation (écart-type / الانحراف المعياري) of an array of numbers
 */
export const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const sumSquaredDiffs = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  return Math.sqrt(sumSquaredDiffs / values.length);
};

export type GenderMode = 'ALL' | 'F' | 'M' | 'SEPARATE';

export interface GroupGenerationOptions {
  numberOfGroups?: number; // Exact count of groups requested by teacher (e.g. 2, 3, 4, 5, 6)
  maxStudentsPerGroup?: number;
  genderMode?: GenderMode;
}

interface VmaBucket {
  vma: number;
  students: StudentResult[];
}

/**
 * Partitions VMA buckets into groups without ever splitting students with identical VMA values.
 */
const partitionBucketsIntoGroups = (
  buckets: VmaBucket[],
  requestedGroupCount: number,
  namePrefix: string = 'المجموعة'
): AffinityGroup[] => {
  if (buckets.length === 0) return [];
  
  const actualGroupCount = Math.min(requestedGroupCount, buckets.length);
  const groups: AffinityGroup[] = [];
  
  let currentBucketIdx = 0;

  for (let g = 0; g < actualGroupCount; g++) {
    const remainingGroups = actualGroupCount - g;
    const remainingStudents = buckets.slice(currentBucketIdx).reduce((sum, b) => sum + b.students.length, 0);
    const targetCount = Math.round(remainingStudents / remainingGroups);

    const groupStudents: StudentResult[] = [];

    while (currentBucketIdx < buckets.length) {
      const nextBucket = buckets[currentBucketIdx];
      const bucketsLeftAfterThis = buckets.length - (currentBucketIdx + 1);
      const groupsLeftAfterThis = remainingGroups - 1;

      // Ensure we leave at least one bucket for each remaining group
      if (bucketsLeftAfterThis < groupsLeftAfterThis && groupStudents.length > 0) {
        break;
      }

      const currentSize = groupStudents.length;
      const sizeWithNext = currentSize + nextBucket.students.length;

      // If we already have students in this group, decide whether adding next bucket is optimal
      if (currentSize > 0 && groupsLeftAfterThis > 0) {
        const diffCurrent = Math.abs(currentSize - targetCount);
        const diffNext = Math.abs(sizeWithNext - targetCount);

        if (diffNext > diffCurrent && currentSize >= 1) {
          break;
        }
      }

      groupStudents.push(...nextBucket.students);
      currentBucketIdx++;
    }

    if (groupStudents.length > 0) {
      const vmaValues = groupStudents.map(s => s.vma);
      const totalVma = vmaValues.reduce((sum, v) => sum + v, 0);
      const vmaMoyenne = totalVma / groupStudents.length;
      const ecartType = calculateStandardDeviation(vmaValues, vmaMoyenne);
      
      const minVma = Math.min(...vmaValues);
      const maxVma = Math.max(...vmaValues);
      const vmaRange = minVma.toFixed(1) === maxVma.toFixed(1) 
        ? `${minVma.toFixed(1)}` 
        : `${minVma.toFixed(1)} - ${maxVma.toFixed(1)}`;

      const coefficientVariation = vmaMoyenne > 0 ? (ecartType / vmaMoyenne) * 100 : 0;

      groups.push({
        name: `${namePrefix} ${g + 1}`,
        students: groupStudents,
        vmaMoyenne: Number(vmaMoyenne.toFixed(2)),
        ecartType: Number(ecartType.toFixed(2)),
        vmaRange: vmaRange,
        coefficientVariation: Number(coefficientVariation.toFixed(1)),
      });
    }
  }

  // Safeguard: If any bucket remains unassigned, append to last group
  if (currentBucketIdx < buckets.length && groups.length > 0) {
    const lastGroup = groups[groups.length - 1];
    while (currentBucketIdx < buckets.length) {
      lastGroup.students.push(...buckets[currentBucketIdx].students);
      currentBucketIdx++;
    }
    const vmaValues = lastGroup.students.map(s => s.vma);
    const totalVma = vmaValues.reduce((sum, v) => sum + v, 0);
    const vmaMoyenne = totalVma / lastGroup.students.length;
    const ecartType = calculateStandardDeviation(vmaValues, vmaMoyenne);
    const minVma = Math.min(...vmaValues);
    const maxVma = Math.max(...vmaValues);
    lastGroup.vmaMoyenne = Number(vmaMoyenne.toFixed(2));
    lastGroup.ecartType = Number(ecartType.toFixed(2));
    lastGroup.vmaRange = minVma.toFixed(1) === maxVma.toFixed(1) ? `${minVma.toFixed(1)}` : `${minVma.toFixed(1)} - ${maxVma.toFixed(1)}`;
    lastGroup.coefficientVariation = Number((vmaMoyenne > 0 ? (ecartType / vmaMoyenne) * 100 : 0).toFixed(1));
  }

  return groups;
};

/**
 * Creates VMA buckets for a set of students (sorted descending by VMA).
 * Students with identical VMA values belong to the same bucket.
 */
const buildVmaBuckets = (students: StudentResult[]): VmaBucket[] => {
  const sorted = [...students].sort((a, b) => b.vma - a.vma);
  const bucketsMap = new Map<number, StudentResult[]>();

  for (const s of sorted) {
    // Key by rounded VMA (1 decimal place) to avoid precision mismatches
    const key = Number(s.vma.toFixed(1));
    if (!bucketsMap.has(key)) {
      bucketsMap.set(key, []);
    }
    bucketsMap.get(key)!.push(s);
  }

  const buckets: VmaBucket[] = [];
  bucketsMap.forEach((studentList, vma) => {
    buckets.push({ vma, students: studentList });
  });

  return buckets.sort((a, b) => b.vma - a.vma);
};

/**
 * Generates homogeneous groups based on VMA results.
 * Guarantees that students with identical VMA values are NEVER placed in different groups.
 * Supports gender-based division (ALL, F, M, SEPARATE).
 */
export const generateAffinityGroups = (
  results: StudentResult[], 
  optionsOrGroupSize: number | GroupGenerationOptions = 4
): AffinityGroup[] => {
  const validResults = results.filter(r => r && typeof r.vma === 'number' && !isNaN(r.vma) && r.vma > 0);

  if (validResults.length === 0) {
    return [];
  }

  let requestedGroupCount = 4;
  let genderMode: GenderMode = 'ALL';

  if (typeof optionsOrGroupSize === 'number') {
    if (optionsOrGroupSize <= 10) {
      requestedGroupCount = Math.max(1, Math.min(optionsOrGroupSize, validResults.length));
    } else {
      requestedGroupCount = Math.max(1, Math.ceil(validResults.length / optionsOrGroupSize));
    }
  } else if (typeof optionsOrGroupSize === 'object') {
    if (optionsOrGroupSize.genderMode) {
      genderMode = optionsOrGroupSize.genderMode;
    }
    if (optionsOrGroupSize.numberOfGroups) {
      requestedGroupCount = Math.max(1, optionsOrGroupSize.numberOfGroups);
    } else if (optionsOrGroupSize.maxStudentsPerGroup) {
      requestedGroupCount = Math.max(1, Math.ceil(validResults.length / Math.max(1, optionsOrGroupSize.maxStudentsPerGroup)));
    }
  }

  if (genderMode === 'F') {
    const females = validResults.filter(r => r.sexe === 'F');
    const buckets = buildVmaBuckets(females);
    return partitionBucketsIntoGroups(buckets, requestedGroupCount, 'مجموعة الإناث');
  }

  if (genderMode === 'M') {
    const males = validResults.filter(r => r.sexe === 'M');
    const buckets = buildVmaBuckets(males);
    return partitionBucketsIntoGroups(buckets, requestedGroupCount, 'مجموعة الذكور');
  }

  if (genderMode === 'SEPARATE') {
    const females = validResults.filter(r => r.sexe === 'F');
    const males = validResults.filter(r => r.sexe === 'M');
    
    const femaleBuckets = buildVmaBuckets(females);
    const maleBuckets = buildVmaBuckets(males);

    const femaleGroups = partitionBucketsIntoGroups(femaleBuckets, requestedGroupCount, 'مجموعة الإناث');
    const maleGroups = partitionBucketsIntoGroups(maleBuckets, requestedGroupCount, 'مجموعة الذكور');

    return [...femaleGroups, ...maleGroups];
  }

  // Default: ALL (Mixed)
  const buckets = buildVmaBuckets(validResults);
  return partitionBucketsIntoGroups(buckets, requestedGroupCount, 'المجموعة');
};

