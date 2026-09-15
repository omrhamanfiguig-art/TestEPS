import type { AffinityGroup } from '../types';

export const exportGroupsToWord = (groups: AffinityGroup[], className: string) => {
  const studentsInGroups = groups.flatMap(g => g.students);
  if (studentsInGroups.length === 0) {
    alert("Aucun groupe avec des élèves à exporter.");
    return;
  }

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Groupes d'Affinité</title>
    <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #333; }
        h2 { color: #444; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
    </head>
    <body>
      <h1>Groupes d'Affinité - ${className}</h1>
      <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
  `;

  groups.forEach(group => {
    if (group.students.length > 0) {
      htmlContent += `
        <h2>${group.name} (VMA moyenne: ${group.vmaMoyenne.toFixed(2)} km/h - Écart-type: ±${group.ecartType.toFixed(2)} km/h)</h2>
        <p>Plage VMA: ${group.vmaRange} km/h ${group.coefficientVariation ? `| Coefficient de variation (CV): ${group.coefficientVariation.toFixed(1)}%` : ''}</p>
        <table>
          <thead>
            <tr>
              <th>Numéro Élève</th>
              <th>Nom Élève</th>
              <th>VMA (km/h)</th>
              <th>Palier Atteint</th>
            </tr>
          </thead>
          <tbody>
      `;
      group.students.forEach(student => {
        htmlContent += `
          <tr>
            <td>${student.numeroEleve}</td>
            <td>${student.nomEleve || ''}</td>
            <td>${student.vma.toFixed(1)}</td>
            <td>${student.palierAtteint}</td>
          </tr>
        `;
      });
      htmlContent += `</tbody></table>`;
    }
  });

  htmlContent += `</body></html>`;
  
  const blob = new Blob(['\uFEFF', htmlContent], {
    type: 'application/msword'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const safeClassName = className.replace(/\s+/g, '_');
  link.setAttribute('download', `groupes_affinite_vma_${safeClassName}.doc`);
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};