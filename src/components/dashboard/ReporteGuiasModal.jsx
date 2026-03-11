import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { dashboardService } from '../../services/api';
import './ReporteGuiasModal.css';

const ReporteGuiasModal = ({ isOpen, onClose }) => {
  const [empresas, setEmpresas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [empresa, setEmpresa] = useState('');
  const [mes, setMes] = useState('');
  const [semana, setSemana] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    if (isOpen) {
      loadOpciones();
    }
  }, [isOpen]);

  const loadOpciones = async () => {
    setLoadingOpciones(true);
    try {
      const result = await dashboardService.getReporteGuiasOpciones();
      setEmpresas(result.empresas || []);
      setMeses(result.meses || []);
    } catch (error) {
      console.error('Error cargando opciones:', error);
    } finally {
      setLoadingOpciones(false);
    }
  };

  const canGenerate = empresa && mes;

  const handleGenerar = async (semanaParam) => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const result = await dashboardService.getReporteGuias({ empresa, mes, semana: semanaParam });
      setData(result);
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanaChange = (nuevaSemana) => {
    setSemana(nuevaSemana);
    handleGenerar(nuevaSemana || undefined);
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;
    const semanaLabel = semana ? ` — Semana ${semana}` : '';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>${empresa} - Guías Emitidas - ${mes}${semanaLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 12px; font-size: 8px; }
          h2 { font-size: 13px; margin: 12px 0 6px 0; color: #1a1a1a; text-align: center; }
          h3 { font-size: 11px; margin: 8px 0 4px 0; color: #0F172A; }
          h4 { font-size: 10px; margin: 4px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 7.5px; }
          th, td { border: 1px solid #E2E8F0; padding: 2px 4px; text-align: right; }
          th { background: #1B7430; color: white; font-weight: 600; text-align: center; }
          th.col-info { background: #2563EB; border-color: #1D4ED8; }
          th.col-peso { background: #5B21B6; border-color: #4C1D95; }
          th.col-ref { background: #B45309; border-color: #92400E; }
          th.col-cliente { background: #145524; border-color: #0D3D19; }
          th.col-money { background: #7F1D1D; border-color: #691B1B; }
          td.col-left { text-align: left; }
          tr.fila-subtotal { background: #F1F5F9; font-weight: 700; }
          tr.fila-total { background: #E2E8F0; font-weight: 700; }
          .totales-moneda { margin-top: 4px; font-size: 9px; font-weight: 700; }
          @media print { body { padding: 6px; } @page { size: landscape; margin: 8mm; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDownloadExcel = () => {
    if (!data || data.error) return;
    const rows = [];
    rows.push([`${data.empresa} — TRANSPORTE SEGÚN GUÍAS EMITIDAS`]);
    rows.push(['Mes:', data.mes, semana ? `Semana: ${semana}` : 'Todo el mes']);
    rows.push([]);
    rows.push([
      'Placa / Semana', 'Fecha', 'Guía (Transp.)', 'Conductor',
      'TN Enviada', 'TN Recibida', 'N° Ticket', 'Guía (Remit.)',
      'Cliente', 'Recorrido', 'Material', 'Precio', 'Divisa', 'B.I.', 'Importe Total',
    ]);
    for (const bloque of data.bloques) {
      rows.push([`▶ UNIDAD: ${bloque.placa}`]);
      for (const sem of bloque.semanas) {
        rows.push([`  ${sem.semana}`]);
        for (const v of sem.viajes) {
          const fechaStr = v.fecha ? String(v.fecha).substring(0, 10) : '';
          rows.push([
            '', fechaStr, v.grt, v.conductor,
            Number(v.peso), Number(v.pesoMina), v.ticket, v.grr,
            v.cliente, v.recorrido, v.material,
            Number(v.precio), v.divisa, Number(v.bi), Number(v.importeTotal),
          ]);
        }
        rows.push(['', `Subtotal — ${sem.semana}`, '', '', '', Number(sem.totalTn)]);
      }
      rows.push([`TOTAL ${bloque.placa}`, '', '', '', '', Number(bloque.totalTn)]);
      if (bloque.totalDolares > 0) rows.push(['', 'Total Dólares (USD):', Number(bloque.totalDolares)]);
      if (bloque.totalSoles > 0)   rows.push(['', 'Total Soles (PEN):', Number(bloque.totalSoles)]);
      rows.push([]);
    }
    rows.push(['TOTALES GENERALES']);
    rows.push(['Total TN:', Number(data.totalesGenerales.totalTn)]);
    if (data.totalesGenerales.totalDolares > 0) rows.push(['Total Dólares (USD):', Number(data.totalesGenerales.totalDolares)]);
    if (data.totalesGenerales.totalSoles > 0)   rows.push(['Total Soles (PEN):', Number(data.totalesGenerales.totalSoles)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guías Emitidas');
    const fileName = `Guias_${data.empresa}_${data.mes}${semana ? `_Sem${semana}` : ''}.xlsx`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, fileName);
  };

  if (!isOpen) return null;

  const formatNum = (n) => {
    const val = Number(n) || 0;
    return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (d) => {
    if (!d) return '';
    // Parsear solo YYYY-MM-DD para evitar desfase UTC→Lima (UTC-5)
    const dateStr = typeof d === 'string' ? d.substring(0, 10) : new Date(d).toISOString().substring(0, 10);
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const renderBloque = (bloque, idx) => (
    <div key={idx} className="rg-bloque">
      <h3>UNID: {bloque.placa}</h3>
      {bloque.semanas.map((sem, sIdx) => (
        <div key={sIdx} className="rg-semana-block">
          <table className="rg-table">
            <colgroup>
              <col style={{ width: '7%' }} />{/* Fecha */}
              <col style={{ width: '9%' }} />{/* Guía Transp */}
              <col style={{ width: '12%' }} />{/* Conductor */}
              <col style={{ width: '7%' }} />{/* Peso Guía */}
              <col style={{ width: '7%' }} />{/* Peso Ticket */}
              <col style={{ width: '6%' }} />{/* N° Ticket */}
              <col style={{ width: '9%' }} />{/* Guía Remitente */}
              <col style={{ width: '10%' }} />{/* Cliente */}
              <col style={{ width: '10%' }} />{/* Recorrido */}
              <col style={{ width: '8%' }} />{/* Material */}
              <col style={{ width: '5%' }} />{/* Precio */}
              <col style={{ width: '5%' }} />{/* B.I. */}
              <col style={{ width: '5%' }} />{/* Importe Total */}
            </colgroup>
            {sIdx === 0 && (
              <thead>
                <tr>
                  <th className="col-info">Fecha</th>
                  <th className="col-info">Guía (Transportista)</th>
                  <th className="col-info">Conductor</th>
                  <th className="col-peso">Peso Guía<br/>(TN Enviada)</th>
                  <th className="col-peso">Peso Ticket<br/>(TN Recibida)</th>
                  <th className="col-ref">N° Ticket</th>
                  <th className="col-ref">Guía (Remitente)</th>
                  <th className="col-cliente">Cliente</th>
                  <th className="col-cliente">Recorrido</th>
                  <th className="col-cliente">Material</th>
                  <th className="col-money">Precio</th>
                  <th className="col-money">B.I.</th>
                  <th className="col-money">Importe Total</th>
                </tr>
              </thead>
            )}
            <tbody>
              {sem.viajes.map((v, vIdx) => (
                <tr key={vIdx}>
                  <td className="col-left">{formatDate(v.fecha)}</td>
                  <td className="col-left">{v.grt}</td>
                  <td className="col-left">{v.conductor}</td>
                  <td>{formatNum(v.peso)} TN</td>
                  <td>{formatNum(v.pesoMina)} TN</td>
                  <td className="col-left">{v.ticket}</td>
                  <td className="col-left">{v.grr}</td>
                  <td className="col-left">{v.cliente}</td>
                  <td className="col-left">{v.recorrido}</td>
                  <td className="col-left">{v.material}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.precio)}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.bi)}</td>
                  <td>{v.divisa === 'PEN' ? 'S/' : '$'}{formatNum(v.importeTotal)}</td>
                </tr>
              ))}
              <tr className="fila-subtotal">
                <td colSpan={4} className="col-left">{sem.semana}</td>
                <td>{formatNum(sem.totalTn)} TN</td>
                <td colSpan={8}></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      <div className="rg-bloque-totales">
        <table className="rg-table">
          <colgroup>
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <tbody>
            <tr className="fila-total">
              <td colSpan={4} className="col-left">TOTAL</td>
              <td>{formatNum(bloque.totalTn)} TN</td>
              <td colSpan={8}></td>
            </tr>
          </tbody>
        </table>
        <div className="totales-moneda">
          {bloque.totalDolares > 0 && <span className="moneda-tag">Total Dólares: ${formatNum(bloque.totalDolares)}</span>}
          {bloque.totalSoles > 0 && <span className="moneda-tag">Total Soles: S/ {formatNum(bloque.totalSoles)}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rg-modal-overlay" onClick={onClose}>
      <div className="rg-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rg-modal-header">
          <div className="rg-modal-title">
            <h1>Transporte Según Guías Emitidas</h1>
          </div>
          <div className="rg-modal-actions">
            {data && !data.error && (
              <>
                <button className="btn-download-excel" onClick={handleDownloadExcel}>
                  📊 Descargar Excel
                </button>
                <button className="btn-download-pdf" onClick={handleDownloadPDF}>
                  📥 Descargar PDF
                </button>
              </>
            )}
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rg-filters-bar">
          <div className="rg-filter-item">
            <label>Empresa de Transporte:</label>
            <select
              value={empresa}
              onChange={(e) => { setEmpresa(e.target.value); setSemana(''); setData(null); }}
              disabled={loadingOpciones}
            >
              <option value="">Seleccionar empresa</option>
              {empresas.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </div>

          <div className="rg-filter-item">
            <label>Mes:</label>
            <select
              value={mes}
              onChange={(e) => { setMes(e.target.value); setSemana(''); setData(null); }}
              disabled={!empresa}
            >
              <option value="">Seleccionar mes</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {data && data.semanasDisponibles && data.semanasDisponibles.length > 0 && (
            <div className="rg-filter-item">
              <label>Semana:</label>
              <select value={semana} onChange={(e) => handleSemanaChange(e.target.value)}>
                <option value="">Todo el mes</option>
                {data.semanasDisponibles.map(s => (
                  <option key={s} value={s}>Semana {s}</option>
                ))}
              </select>
            </div>
          )}

          <button className="rg-btn-generar" onClick={() => handleGenerar(semana || undefined)} disabled={!canGenerate || loading}>
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Body */}
        <div className="rg-modal-body">
          {loading ? (
            <div className="loading-section"><div className="spinner"></div><p>Generando reporte...</p></div>
          ) : !data ? (
            <div className="empty-section">Selecciona empresa y mes, luego presiona "Generar Reporte"</div>
          ) : data.error ? (
            <div className="empty-section">{data.error}</div>
          ) : (
            <div ref={printRef}>
              <h2>{data.empresa} — TRANSPORTE SEGÚN GUÍAS EMITIDAS</h2>
              <h4 style={{ textAlign: 'center', color: '#1B7430', marginBottom: 12, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {data.mes}{semana && <span style={{ color: '#1a6fa8' }}> · Semana {semana}</span>}
              </h4>

              {data.bloques.map((bloque, idx) => renderBloque(bloque, idx))}

              {/* Totales generales */}
              <div className="rg-totales-generales">
                <h3>TOTALES GENERALES</h3>
                <p>Total TN: <strong>{formatNum(data.totalesGenerales.totalTn)} TN</strong></p>
                {data.totalesGenerales.totalDolares > 0 && (
                  <p>Total Dólares: <strong>${formatNum(data.totalesGenerales.totalDolares)}</strong></p>
                )}
                {data.totalesGenerales.totalSoles > 0 && (
                  <p>Total Soles: <strong>S/ {formatNum(data.totalesGenerales.totalSoles)}</strong></p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReporteGuiasModal;
