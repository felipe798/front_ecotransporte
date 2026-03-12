import { useState, useEffect, useRef } from 'react';
import XLSX from 'xlsx-js-style';
import { dashboardService } from '../../services/api';
import './TablasDetalladasModal.css';

const TablasDetalladasModal = ({ isOpen, onClose, mesesDisponibles }) => {
  const [mes, setMes] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [semana, setSemana] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen && mesesDisponibles.length > 0 && !mes) {
      setMes(mesesDisponibles[0]);
    }
  }, [isOpen, mesesDisponibles]);

  // Cuando cambia el mes, resetear semana y recargar con mes nuevo
  useEffect(() => {
    if (mes) {
      setSemana('');
      loadData(mes, '');
    }
  }, [mes]);

  const handleSemanaChange = (nuevaSemana) => {
    setSemana(nuevaSemana);
    loadData(mes, nuevaSemana || undefined);
  };

  const loadData = async (mesParam, semanaParam) => {
    setLoading(true);
    try {
      const result = await dashboardService.getTablasDetalladas(mesParam, semanaParam || undefined);
      setData(result);
    } catch (error) {
      console.error('Error cargando tablas detalladas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const semanaLabel = semana ? ` — Semana ${semana}` : '';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Tablas Detalladas - ${mes}${semanaLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
          h2 { font-size: 16px; margin: 15px 0 8px 0; color: #1E3D2C; }
          h3 { font-size: 13px; margin: 10px 0 5px 0; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          th, td { border: 1px solid #E2E8F0; padding: 4px 6px; text-align: right; color: #1E2A3A; }
          th { background: #A8DFC4; color: #1E3D2C; font-weight: 600; text-align: center; }
          th.col-cliente { text-align: left; background: #96D9B8; color: #173324; }
          th.col-general { background: #A3BFFA; border-color: #8DAFEF; color: #1E2F5C; }
          th.col-empresa-0 { background: #C4A8F0; border-color: #B393E5; color: #2E2048; }
          th.col-empresa-1 { background: #FAC98A; border-color: #EBB876; color: #3D2200; }
          th.col-empresa-2 { background: #F5A3A8; border-color: #E89298; color: #3D1018; }
          th.col-empresa-3 { background: #A8C8DC; border-color: #95BACE; color: #1A3040; }
          td.col-cliente { text-align: left; font-weight: 500; }
          td.col-material { padding-left: 20px; font-weight: 400; font-size: 9px; }
          tr.fila-cliente-header td { background: #C5D0E0; color: #1E2A3A; font-weight: 700; text-align: left; }
          tr.fila-total { background: #A8DBC0; font-weight: 700; color: #1E3D2C; }
          .margen-table { margin: 10px 0; }
          .margen-table th { background: #A3BFFA; }
          .margen-table td { font-weight: 600; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadExcel = () => {
    if (!data) return;
    const empresas = empresaFiltro
      ? data.empresas.filter(e => e === empresaFiltro)
      : data.empresas;
    const semanaLabel = semana ? `Semana ${semana}` : 'Todo el mes';
    const titulo = `Reporte Detallado — ${mes.toUpperCase()}${semana ? ` · Semana ${semana}` : ''}`;

    const border = { border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'E2E8F0' } } } };
    const titleStyle = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3D2C' } }, alignment: { horizontal: 'center' } };
    const infoStyle = { font: { bold: true, sz: 10, color: { rgb: '333333' } } };
    const hCliente = { font: { bold: true, sz: 9, color: { rgb: '173324' } }, fill: { fgColor: { rgb: '96D9B8' } }, alignment: { horizontal: 'left', wrapText: true }, ...border };
    const hGeneral = { font: { bold: true, sz: 9, color: { rgb: '1E2F5C' } }, fill: { fgColor: { rgb: 'A3BFFA' } }, alignment: { horizontal: 'center', wrapText: true }, ...border };
    const empColors = ['C4A8F0', 'FAC98A', 'F5A3A8', 'A8C8DC'];
    const empFonts = ['2E2048', '3D2200', '3D1018', '1A3040'];
    const cellLeft = { ...border, font: { sz: 9 }, alignment: { horizontal: 'left' } };
    const cellRight = { ...border, font: { sz: 9 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const clienteRowStyle = { font: { bold: true, sz: 10, color: { rgb: '1E2A3A' } }, fill: { fgColor: { rgb: 'C5D0E0' } }, alignment: { horizontal: 'left' }, ...border };
    const materialStyle = { font: { sz: 9 }, alignment: { horizontal: 'left' }, ...border };
    const totalRowStyle = { font: { bold: true, sz: 10, color: { rgb: '1E3D2C' } }, fill: { fgColor: { rgb: 'A8DBC0' } }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', ...border };
    const totalLabelStyle = { ...totalRowStyle, alignment: { horizontal: 'left' } };
    const white = { font: { sz: 9 } };

    const buildSheet = (type) => {
      const colCount = 3 + empresas.length * 2;
      const rows = [];

      // Título
      const titleRow = Array(colCount).fill({ v: '', s: titleStyle });
      titleRow[0] = { v: titulo, s: titleStyle };
      rows.push(titleRow);

      // Info
      const info = Array(colCount).fill({ v: '', s: white });
      info[0] = { v: `Mes: ${mes}`, s: infoStyle };
      info[1] = { v: `${semanaLabel}`, s: infoStyle };
      info[2] = { v: `Empresa: ${empresaFiltro || 'Todas'}`, s: infoStyle };
      rows.push(info);
      rows.push(Array(colCount).fill({ v: '', s: white }));

      // Headers
      const header = [];
      header.push({ v: 'Cliente / Material', s: hCliente });
      header.push({ v: 'General TNE', s: hGeneral });
      header.push({ v: 'General Importe', s: hGeneral });
      empresas.forEach((emp, i) => {
        const empStyle = { font: { bold: true, sz: 9, color: { rgb: empFonts[i % empFonts.length] } }, fill: { fgColor: { rgb: empColors[i % empColors.length] } }, alignment: { horizontal: 'center', wrapText: true }, ...border };
        header.push({ v: `${emp} TNE`, s: empStyle });
        header.push({ v: `${emp} Importe`, s: empStyle });
      });
      rows.push(header);

      // Data
      for (const grupo of data.grupos) {
        const cRow = Array(colCount).fill({ v: '', s: clienteRowStyle });
        cRow[0] = { v: `▶ ${grupo.cliente}`, s: clienteRowStyle };
        rows.push(cRow);

        for (const mat of grupo.materiales) {
          const row = [];
          row.push({ v: `  ${mat.label}`, s: materialStyle });
          row.push({ v: Number(mat.data.general.tne) || 0, s: cellRight });
          row.push({ v: Number(type === 'venta' ? mat.data.general.importeVenta : mat.data.general.importeCosto) || 0, s: cellRight });
          for (const emp of empresas) {
            const d = mat.data[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
            row.push({ v: Number(d.tne) || 0, s: cellRight });
            row.push({ v: Number(type === 'venta' ? d.importeVenta : d.importeCosto) || 0, s: cellRight });
          }
          rows.push(row);
        }
      }

      // Totales
      for (const [div, label] of [['USD', 'Total Dólares (USD)'], ['PEN', 'Total Soles (PEN)']]) {
        const tot = data.totales[div];
        const row = [];
        row.push({ v: label, s: totalLabelStyle });
        row.push({ v: Number(tot.general.tne) || 0, s: totalRowStyle });
        row.push({ v: Number(type === 'venta' ? tot.general.importeVenta : tot.general.importeCosto) || 0, s: totalRowStyle });
        for (const emp of empresas) {
          const d = tot[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
          row.push({ v: Number(d.tne) || 0, s: totalRowStyle });
          row.push({ v: Number(type === 'venta' ? d.importeVenta : d.importeCosto) || 0, s: totalRowStyle });
        }
        rows.push(row);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Anchos
      const cols = [{ wch: 30 }, { wch: 14 }, { wch: 14 }];
      empresas.forEach(() => { cols.push({ wch: 14 }, { wch: 14 }); });
      ws['!cols'] = cols;
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
      return ws;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildSheet('venta'), 'Venta');
    XLSX.utils.book_append_sheet(wb, buildSheet('costo'), 'Costo');

    // Hoja Margen
    const colCount = 2 + empresas.length;
    const margenRows = [];
    const mTitleRow = Array(colCount).fill({ v: '', s: titleStyle });
    mTitleRow[0] = { v: titulo, s: titleStyle };
    margenRows.push(mTitleRow);

    const mInfo = Array(colCount).fill({ v: '', s: white });
    mInfo[0] = { v: `Mes: ${mes}`, s: infoStyle };
    mInfo[1] = { v: `${semanaLabel}`, s: infoStyle };
    margenRows.push(mInfo);
    margenRows.push(Array(colCount).fill({ v: '', s: white }));

    const mLabel = Array(colCount).fill({ v: '', s: { font: { bold: true, sz: 12, color: { rgb: '1E3D2C' } } } });
    mLabel[0] = { v: 'Margen de Ganancia', s: mLabel[0].s };
    margenRows.push(mLabel);

    const mHeader = [{ v: 'Concepto', s: hCliente }, { v: 'General', s: hGeneral }];
    empresas.forEach((emp, i) => {
      const empStyle = { font: { bold: true, sz: 9, color: { rgb: empFonts[i % empFonts.length] } }, fill: { fgColor: { rgb: empColors[i % empColors.length] } }, alignment: { horizontal: 'center', wrapText: true }, ...border };
      mHeader.push({ v: emp, s: empStyle });
    });
    margenRows.push(mHeader);

    for (const [div, label] of [['USD', 'Dólares (USD)'], ['PEN', 'Soles (PEN)']]) {
      const row = [{ v: label, s: totalLabelStyle }, { v: Number(data.margen[div].general.margen) || 0, s: totalRowStyle }];
      for (const emp of empresas) row.push({ v: Number((data.margen[div][emp] || { margen: 0 }).margen) || 0, s: totalRowStyle });
      margenRows.push(row);
    }

    const margenWs = XLSX.utils.aoa_to_sheet(margenRows);
    const mCols = [{ wch: 25 }, { wch: 14 }];
    empresas.forEach(() => mCols.push({ wch: 14 }));
    margenWs['!cols'] = mCols;
    margenWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
    XLSX.utils.book_append_sheet(wb, margenWs, 'Margen');

    const fileName = `Tablas_Detalladas_${mes.toUpperCase()}${semana ? `_Sem${semana}` : ''}${empresaFiltro ? `_${empresaFiltro.replace(/\s+/g, '_')}` : ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (!isOpen) return null;

  const formatNum = (n) => {
    const val = Number(n) || 0;
    return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderTable = (title, type) => {
    if (!data) return null;
    const { grupos, totales } = data;
    const empresas = empresaFiltro
      ? data.empresas.filter(e => e === empresaFiltro)
      : data.empresas;

    return (
      <div className="tabla-detallada-section">
        <h2>{title}</h2>
        <div className="tabla-scroll-container">
          <table className="tabla-detallada">
            <colgroup>
              <col style={{ minWidth: '140px' }} />
              {empresas.concat(['general']).map(() => [
                <col key={Math.random()} style={{ minWidth: '80px' }} />,
                <col key={Math.random()} style={{ minWidth: '90px' }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="col-cliente" rowSpan={2}>Cliente</th>
                <th className="col-general" colSpan={2}>General</th>
                {empresas.map((emp, idx) => (
                  <th key={emp} className={`col-empresa-${idx % 4}`} colSpan={2}>{emp}</th>
                ))}
              </tr>
              <tr>
                <th className="col-general">TNE</th>
                <th className="col-general">Importe</th>
                {empresas.map((emp, idx) => (
                  <th key={`${emp}-tne`} className={`col-empresa-${idx % 4}`}>TNE</th>
                )).flatMap((el, i) => [el, <th key={`${empresas[i]}-imp`} className={`col-empresa-${i % 4}`}>Importe</th>])}
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo, gIdx) => (
                <>
                  {/* Fila encabezado del cliente */}
                  <tr key={`cliente-${gIdx}`} className="fila-cliente-header">
                    <td className="col-cliente" colSpan={3 + empresas.length * 2}>
                      {grupo.cliente}
                    </td>
                  </tr>
                  {/* Filas de materiales */}
                  {grupo.materiales.map((mat, mIdx) => (
                    <tr key={`mat-${gIdx}-${mIdx}`}>
                      <td className="col-cliente col-material">{mat.label}</td>
                      <td>{formatNum(mat.data.general.tne)} TN</td>
                      <td>{mat.divisa === 'PEN' ? 'S/' : '$'}{formatNum(type === 'venta' ? mat.data.general.importeVenta : mat.data.general.importeCosto)}</td>
                      {empresas.map(emp => {
                        const d = mat.data[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                        return [
                          <td key={`${emp}-${gIdx}-${mIdx}-tne`}>{formatNum(d.tne)} TN</td>,
                          <td key={`${emp}-${gIdx}-${mIdx}-imp`}>{mat.divisa === 'PEN' ? 'S/' : '$'}{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                        ];
                      })}
                    </tr>
                  ))}
                </>
              ))}
              {/* Total Dólares */}
              <tr className="fila-total">
                <td className="col-cliente">Total Dólares (USD)</td>
                <td>{formatNum(totales.USD.general.tne)} TN</td>
                <td>${formatNum(type === 'venta' ? totales.USD.general.importeVenta : totales.USD.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.USD[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`usd-${emp}-tne`}>{formatNum(d.tne)} TN</td>,
                    <td key={`usd-${emp}-imp`}>${formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                  ];
                })}
              </tr>
              {/* Total Soles */}
              <tr className="fila-total">
                <td className="col-cliente">Total Soles (PEN)</td>
                <td>{formatNum(totales.PEN.general.tne)} TN</td>
                <td>S/{formatNum(type === 'venta' ? totales.PEN.general.importeVenta : totales.PEN.general.importeCosto)}</td>
                {empresas.map(emp => {
                  const d = totales.PEN[emp] || { tne: 0, importeVenta: 0, importeCosto: 0 };
                  return [
                    <td key={`pen-${emp}-tne`}>{formatNum(d.tne)} TN</td>,
                    <td key={`pen-${emp}-imp`}>S/{formatNum(type === 'venta' ? d.importeVenta : d.importeCosto)}</td>,
                  ];
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMargen = () => {
    if (!data) return null;
    const { margen } = data;
    const empresas = empresaFiltro
      ? data.empresas.filter(e => e === empresaFiltro)
      : data.empresas;

    return (
      <div className="tabla-detallada-section margen-section">
        <h2>Margen de Ganancia</h2>
        <div className="tabla-scroll-container">
          <table className="tabla-detallada margen-table">
            <colgroup>
              <col style={{ minWidth: '140px' }} />
              {empresas.concat(['general']).map((_, i) => [
                <col key={`m1-${i}`} style={{ minWidth: '80px' }} />,
                <col key={`m2-${i}`} style={{ minWidth: '90px' }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="col-cliente">Concepto</th>
                <th className="col-general" colSpan={2}>General</th>
                {empresas.map((emp, idx) => (
                  <th key={emp} className={`col-empresa-${idx % 4}`} colSpan={2}>{emp}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-cliente">Dólares (USD)</td>
                <td colSpan={2}>${formatNum(margen.USD.general.margen)}</td>
                {empresas.map(emp => (
                  <td key={`usd-${emp}`} colSpan={2}>${formatNum((margen.USD[emp] || { margen: 0 }).margen)}</td>
                ))}
              </tr>
              <tr>
                <td className="col-cliente">Soles (PEN)</td>
                <td colSpan={2}>S/{formatNum(margen.PEN.general.margen)}</td>
                {empresas.map(emp => (
                  <td key={`pen-${emp}`} colSpan={2}>S/{formatNum((margen.PEN[emp] || { margen: 0 }).margen)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="tablas-modal-overlay" onClick={onClose}>
      <div className="tablas-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tablas-modal-header">
          <div className="tablas-modal-title">
            <h1>Tablas Detalladas</h1>
            <div className="tablas-modal-filter">
              <label>Mes:</label>
              <select value={mes} onChange={(e) => setMes(e.target.value)}>
                {mesesDisponibles.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {data && data.semanasDisponibles && data.semanasDisponibles.length > 0 && (
                <>
                  <label>Semana:</label>
                  <select value={semana} onChange={(e) => handleSemanaChange(e.target.value)}>
                    <option value="">Todo el mes</option>
                    {data.semanasDisponibles.map(s => (
                      <option key={s} value={s}>Semana {s}</option>
                    ))}
                  </select>
                </>
              )}
              {data && data.empresas.length > 0 && (
                <>
                  <label>Empresa de Transporte:</label>
                  <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
                    <option value="">Todas</option>
                    {data.empresas.map(emp => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
          <div className="tablas-modal-actions">
            <button className="btn-download-excel" onClick={handleDownloadExcel} disabled={loading || !data}>
              📊 Descargar Excel
            </button>
            <button className="btn-download-pdf" onClick={handleDownloadPDF} disabled={loading || !data}>
              📥 Descargar PDF
            </button>
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="tablas-modal-body">
          {loading ? (
            <div className="loading-section"><div className="spinner"></div><p>Cargando datos...</p></div>
          ) : !data ? (
            <div className="empty-section">Selecciona un mes para ver los datos</div>
          ) : (
            <>
              <div ref={printRef}>
                <h3 style={{ textAlign: 'center', marginBottom: 14, fontSize: '1.1rem', fontWeight: 700, color: '#1a2332', letterSpacing: '0.02em' }}>
                  Reporte Detallado — <span style={{ textTransform: 'uppercase', color: '#2D8F4E', fontWeight: 800 }}>{mes}</span>
                  {semana && <span style={{ color: '#1a6fa8', fontWeight: 700 }}> · Semana {semana}</span>}
                </h3>
                {renderTable('Tabla de Venta (Precio Unitario × Peso Ticket)', 'venta')}
                {renderTable('Tabla de Costo (Precio Costo × Peso Ticket)', 'costo')}
                {renderMargen()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablasDetalladasModal;
