import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import './TablaUnidadesModal.css';

const TablaUnidadesModal = ({ isOpen, onClose }) => {
  const [mes, setMes] = useState('');
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFin, setSemanaFin] = useState('');
  const [tarifaKey, setTarifaKey] = useState('');

  const [meses, setMeses] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [opciones, setOpciones] = useState([]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOpciones, setLoadingOpciones] = useState(false);

  const printRef = useRef();

  // Carga inicial: obtener meses
  useEffect(() => {
    if (isOpen) {
      loadOpciones();
    }
  }, [isOpen]);

  // Cuando cambia el mes, recargar semanas y opciones de tarifa
  useEffect(() => {
    if (mes) {
      loadOpciones(mes);
      setSemanaInicio('');
      setSemanaFin('');
      setTarifaKey('');
      setData(null);
    }
  }, [mes]);

  const loadOpciones = async (mesParam) => {
    setLoadingOpciones(true);
    try {
      const result = await dashboardService.getTablaUnidadesOpciones(mesParam || '');
      setMeses(result.meses || []);
      if (mesParam) {
        setSemanas(result.semanas || []);
        setOpciones(result.opciones || []);
      }
    } catch (error) {
      console.error('Error cargando opciones:', error);
    } finally {
      setLoadingOpciones(false);
    }
  };

  const canGenerate = mes && semanaInicio && semanaFin && tarifaKey;

  const handleGenerar = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const result = await dashboardService.getTablaUnidades({
        mes,
        semanaInicio,
        semanaFin,
        tarifaKey,
      });
      setData(result);
    } catch (error) {
      console.error('Error generando tabla:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Tabla Unidades - ${mes}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 10px; }
          h2 { font-size: 14px; margin: 10px 0 6px 0; color: #1a1a1a; text-align: center; }
          h3 { font-size: 12px; margin: 6px 0; text-align: center; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9px; }
          th, td { border: 1px solid #333; padding: 3px 5px; text-align: right; }
          th { background: #1B7430; color: white; font-weight: 600; text-align: center; }
          th.col-unidad { text-align: left; background: #145524; }
          td.col-unidad { text-align: left; font-weight: 500; }
          tr.fila-total { background: #e8f5e9; font-weight: 700; }
          @media print { body { padding: 8px; } @page { size: landscape; } }
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

  if (!isOpen) return null;

  const formatNum = (n) => {
    const val = Number(n) || 0;
    return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatInt = (n) => {
    return (Number(n) || 0).toLocaleString('es-PE');
  };

  // Obtener la label de la tarifa seleccionada
  const tarifaLabel = opciones.find(o => o.key === tarifaKey)?.label || '';

  // Filtrar semanas para el selector de fin (>= inicio)
  const semanasParaFin = semanaInicio
    ? semanas.filter(s => semanas.indexOf(s) >= semanas.indexOf(semanaInicio))
    : semanas;

  return (
    <div className="tu-modal-overlay" onClick={onClose}>
      <div className="tu-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tu-modal-header">
          <div className="tu-modal-title">
            <h1>Tabla de Unidades por Carga</h1>
          </div>
          <div className="tu-modal-actions">
            {data && (
              <button className="btn-download-pdf" onClick={handleDownloadPDF}>
                📥 Descargar PDF
              </button>
            )}
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="tu-filters-bar">
          {/* 1. Mes */}
          <div className="tu-filter-item">
            <label>Mes:</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)} disabled={loadingOpciones}>
              <option value="">Seleccionar mes</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* 2. Rango de semanas */}
          <div className="tu-filter-item">
            <label>Desde semana:</label>
            <select
              value={semanaInicio}
              onChange={(e) => { setSemanaInicio(e.target.value); setSemanaFin(''); setData(null); }}
              disabled={!mes || semanas.length === 0}
            >
              <option value="">Seleccionar</option>
              {semanas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="tu-filter-item">
            <label>Hasta semana:</label>
            <select
              value={semanaFin}
              onChange={(e) => { setSemanaFin(e.target.value); setData(null); }}
              disabled={!semanaInicio}
            >
              <option value="">Seleccionar</option>
              {semanasParaFin.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 3. Tarifa/Cliente */}
          <div className="tu-filter-item tu-filter-tarifa">
            <label>Tarifa / Cliente:</label>
            <select
              value={tarifaKey}
              onChange={(e) => { setTarifaKey(e.target.value); setData(null); }}
              disabled={!semanaFin || opciones.length === 0}
            >
              <option value="">Seleccionar</option>
              {opciones.filter(o => o.isFixed).length > 0 && (
                <optgroup label="── Filas fijas ──">
                  {opciones.filter(o => o.isFixed).map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </optgroup>
              )}
              {opciones.filter(o => !o.isFixed).length > 0 && (
                <optgroup label="── Filas dinámicas ──">
                  {opciones.filter(o => !o.isFixed).map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Botón generar */}
          <button className="tu-btn-generar" onClick={handleGenerar} disabled={!canGenerate || loading}>
            {loading ? 'Generando...' : 'Generar Tabla'}
          </button>
        </div>

        {/* Body */}
        <div className="tu-modal-body">
          {loading ? (
            <div className="loading-section"><div className="spinner"></div><p>Generando tabla...</p></div>
          ) : !data ? (
            <div className="empty-section">Selecciona mes, rango de semanas y tarifa, luego presiona "Generar Tabla"</div>
          ) : data.error ? (
            <div className="empty-section">{data.error}</div>
          ) : (
            <div ref={printRef}>
              <h2>Reporte de Carga por Unidad — {tarifaLabel}</h2>
              <h3>{mes} | {data.semanas[0]} a {data.semanas[data.semanas.length - 1]}</h3>

              <div className="tu-table-scroll">
                <table className="tu-table">
                  <thead>
                    <tr>
                      <th className="col-unidad" rowSpan={2}>Unidad Principal</th>
                      {data.semanas.map(sem => (
                        <th key={sem} rowSpan={2}>{sem}</th>
                      ))}
                      <th rowSpan={2}>Total Carga (TN)<br />{mes}</th>
                      <th colSpan={3}>{data.rutaLabel}</th>
                      <th rowSpan={2}>Promedio<br />TN×Carga</th>
                      <th rowSpan={2}>P.U.×Tonelaje</th>
                      <th rowSpan={2}>Total</th>
                    </tr>
                    <tr>
                      <th>N° Viajes</th>
                      <th>TN Carga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filas.map((fila, idx) => (
                      <tr key={idx}>
                        <td className="col-unidad">{fila.unidad}</td>
                        {data.semanas.map(sem => (
                          <td key={sem}>{formatNum(fila.semanas[sem] || 0)}</td>
                        ))}
                        <td>{formatNum(fila.totalCarga)}</td>
                        <td>{formatInt(fila.nViajes)}</td>
                        <td>{formatNum(fila.tnCargaRuta)}</td>
                        <td>{formatNum(fila.totalRuta)}</td>
                        <td>{formatNum(fila.promedio)}</td>
                        <td>{formatNum(fila.puXTonelaje)}</td>
                        <td>{formatNum(fila.total)}</td>
                      </tr>
                    ))}
                    {/* Fila de totales */}
                    <tr className="fila-total">
                      <td className="col-unidad">Total (TN)</td>
                      {data.semanas.map(sem => (
                        <td key={sem}>{formatNum(data.totales.semanas[sem] || 0)}</td>
                      ))}
                      <td>{formatNum(data.totales.totalCarga)}</td>
                      <td>{formatInt(data.totales.nViajes)}</td>
                      <td>{formatNum(data.totales.tnCargaRuta)}</td>
                      <td>{formatNum(data.totales.totalRuta)}</td>
                      <td></td>
                      <td></td>
                      <td>{formatNum(data.totales.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablaUnidadesModal;
