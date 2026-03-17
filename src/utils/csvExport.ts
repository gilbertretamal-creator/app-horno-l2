/**
 * csvExport.ts
 * Exporta un historial de inspecciones a CSV con flattening del JSON ajustes_mecanicos.
 * Compatible con Excel en Windows (BOM UTF-8, separador coma).
 */

/** Valor seguro para celdas: sin nulos ni undefined */
const safe = (val: any): string => (val == null ? '' : String(val));

/** Envuelve un string en comillas dobles para escapar comas y saltos de línea en CSV */
const escapeCsv = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

/** Aplanamiento de un registro de inspección de Supabase */
function flattenRow(row: Record<string, any>): Record<string, string> {
  // -- Columnas base -----------------------------------------------------------
  const flat: Record<string, string> = {
    ID: safe(row.id),
    Fecha: safe(row.fecha),
    Turno: safe(row.turno),
    Tecnico: safe(row.tecnico),
    Alimentacion: safe(row.alimentacion),
    RPM: safe(row.rpm),
    // Temperaturas llantas
    Temp_Llanta_I: safe(row.temp_llanta_i),
    Temp_Llanta_II: safe(row.temp_llanta_ii),
    Temp_Llanta_III: safe(row.temp_llanta_iii),
    Temp_Llanta_IV: safe(row.temp_llanta_iv),
    // Mantos Andes
    Temp_Andes_I: safe(row.temp_manto_andes_i),
    Temp_Andes_II: safe(row.temp_manto_andes_ii),
    Temp_Andes_III: safe(row.temp_manto_andes_iii),
    Temp_Andes_IV: safe(row.temp_manto_andes_iv),
    // Mantos Pacífico
    Temp_Pacifico_I: safe(row.temp_manto_pacifico_i),
    Temp_Pacifico_II: safe(row.temp_manto_pacifico_ii),
    Temp_Pacifico_III: safe(row.temp_manto_pacifico_iii),
    Temp_Pacifico_IV: safe(row.temp_manto_pacifico_iv),
    // Migraciones
    Migracion_I: safe(row.migration_i),
    Migracion_II: safe(row.migration_ii),
    Migracion_III: safe(row.migration_iii),
    Migracion_IV: safe(row.migration_iv),
  };

  // -- Desglose ajustes_mecanicos (JSON) --------------------------------------
  // Estructura: { I: { AN, AS, PN, PS }, II: {...}, III: {...}, IV: {...} }
  const estaciones = ['I', 'II', 'III', 'IV'] as const;
  const posiciones: Record<string, string> = {
    AN: 'Andes_Norte',
    AS: 'Andes_Sur',
    PN: 'Pacifico_Norte',
    PS: 'Pacifico_Sur',
  };

  let ajustesObj: Record<string, any> = {};
  if (row.ajustes_mecanicos) {
    try {
      ajustesObj =
        typeof row.ajustes_mecanicos === 'string'
          ? JSON.parse(row.ajustes_mecanicos)
          : row.ajustes_mecanicos;
    } catch {
      ajustesObj = {};
    }
  }

  for (const est of estaciones) {
    for (const [key, label] of Object.entries(posiciones)) {
      const colName = `E${est}_${label}`;
      flat[colName] = safe(ajustesObj?.[est]?.[key] ?? '');
    }
  }

  // Observaciones al final (más probable que contengan comas/tildes)
  flat['Observaciones'] = safe(row.observaciones);
  flat['Creado_En'] = safe(row.created_at);

  return flat;
}

/** Convierte array de objetos planos en string CSV */
function toCSVString(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsv).join(',');

  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsv(row[h] ?? '')).join(',')
  );

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Descarga todos los registros de inspecciones como un archivo CSV.
 * @param rows   Array de filas sin procesar desde Supabase
 */
export function exportToCSV(rows: Record<string, any>[]): void {
  if (rows.length === 0) {
    console.warn('exportToCSV: no hay datos para exportar.');
    return;
  }

  const flatRows = rows.map(flattenRow);
  const csvContent = toCSVString(flatRows);

  // BOM (\uFEFF) garantiza que Excel en Windows reconozca UTF-8 y muestre tildes correctamente
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `Historial_Horno_L2_${today}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
