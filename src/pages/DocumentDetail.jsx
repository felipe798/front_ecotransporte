import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './DocumentDetail.css';
import FileDropdown from '../components/FileDropdown';

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facturaPdf, setFacturaPdf] = useState(null);
  const facturaInputRef = useRef(null);

  const getFactura = (docId) => {
    if (!docId) return null;
    const seed = docId * 7 + 3;
    if (seed % 3 === 0) return null;
    const num = String(((seed * 13 + 17) % 900) + 100).padStart(3, '0');
    return `Factura-${num}`;
  };

  const handleFacturaUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFacturaPdf(file);
      notification.success(`PDF de factura "${file.name}" cargado correctamente`);
    } else if (file) {
      notification.error('Solo se permiten archivos PDF');
    }
    if (facturaInputRef.current) facturaInputRef.current.value = '';
  };

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      const response = await documentService.getById(id);
      setDocument(response.data);
    } catch (err) {
      setError('Documento no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;
    
    try {
      await documentService.delete(id);
      navigate('/documents');
    } catch (err) {
      alert('Error al eliminar el documento');
    }
  };

  const handleAnular = async () => {
    const action = document.anulado ? 'restaurar' : 'anular';
    if (!window.confirm(`¿Estás seguro de ${action} este documento?`)) return;
    
    try {
      const response = await documentService.anular(id);
      setDocument(response.data);
      notification.success(response.message);
    } catch (err) {
      notification.error(`Error al ${action} el documento`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <Link to="/documents" className="btn-primary">Volver a documentos</Link>
      </div>
    );
  }

  return (
    <div className={`document-detail${document.anulado ? ' anulado' : ''}`}>
      {document.anulado && (
        <div className="anulado-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          DOCUMENTO ANULADO
        </div>
      )}
      <div className="detail-header">
        <div className="header-info">
          <Link to="/documents" className="back-link">← Volver</Link>
          <h1>Guía de Remisión</h1>
          <p className="document-code">{document.grt}</p>
        </div>
        <div className="header-actions">
          <button onClick={handleAnular} className={document.anulado ? 'btn-restore' : 'btn-anular'} title={document.anulado ? 'Restaurar' : 'Anular'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> {document.anulado ? 'Restaurar' : 'Anular'}
          </button>
          <Link to={`/documents/${id}/edit`} className="btn-edit" title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
          </Link>
          <button onClick={handleDelete} className="btn-delete" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Información General */}
        <div className="detail-section">
          <h2>Información General</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>GRT</label>
              <span>{document.grt || '-'}</span>
            </div>
            <div className="info-item">
              <label>GRR</label>
              <span>{document.grr || '-'}</span>
            </div>
            <div className="info-item">
              <label>Fecha</label>
              <span>{document.fecha || '-'}</span>
            </div>
            <div className="info-item">
              <label>Mes</label>
              <span>{document.mes || '-'}</span>
            </div>
            <div className="info-item">
              <label>Semana</label>
              <span>{document.semana || '-'}</span>
            </div>
            <div className="info-item">
              <label>Ticket</label>
              <span>{document.ticket || '-'}</span>
            </div>
          </div>
        </div>

        {/* Transporte */}
        <div className="detail-section">
          <h2>Transporte</h2>
          <div className="info-grid">
            <div className="info-item full">
              <label>Conductor Principal</label>
              <span>{document.transportista || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Empresa de Transporte</label>
              <span>{document.unidadRelacion?.empresa?.nombre || '-'}</span>
            </div>
            <div className="info-item">
              <label>Unidad</label>
              <span>{document.unidad || document.unidadRelacion?.placa || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Producto Transportado</label>
              <span>{document.transportado || '-'}</span>
            </div>
          </div>
        </div>

        {/* Origen y Destino */}
        <div className="detail-section">
          <h2>Origen y Destino</h2>
          <div className="info-grid">
            <div className="info-item full">
              <label>Empresa Remitente</label>
              <span>{document.empresa || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Depósito</label>
              <span>{document.deposito || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Punto de Partida</label>
              <span>{document.partida || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Cliente</label>
              <span>{document.cliente || '-'}</span>
            </div>
            <div className="info-item full">
              <label>Punto de Llegada</label>
              <span>{document.llegada || '-'}</span>
            </div>
          </div>
        </div>

        {/* Tonelaje */}
        <div className="detail-section highlight">
          <h2>Tonelaje</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>TN Enviado</label>
              <span className="value-large">{document.tn_enviado || '-'}</span>
            </div>
            <div className="info-item">
              <label>TN Recibida</label>
              <span className="value-large">{document.tn_recibida || '-'}</span>
            </div>
            <div className="info-item">
              <label>TN Recibida (Data Cruda)</label>
              <span className="value-large">{document.tn_recibida_data_cruda || '-'}</span>
            </div>
          </div>
        </div>

        {/* Archivos adjuntos */}
        <div className="detail-section">
          <h2>Archivos adjuntos</h2>
          <FileDropdown
            document={document}
            onUpdate={(updated) => setDocument(updated)}
          />
        </div>

        {/* Facturación */}
        <div className="detail-section">
          <h2>Facturación</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Código de Factura</label>
              <span className={getFactura(document.id) ? '' : 'no-data'}>{getFactura(document.id) || 'Sin factura'}</span>
            </div>
            <div className="info-item">
              <label>PDF de Factura</label>
              {facturaPdf ? (
                <div className="factura-uploaded">
                  <span className="factura-file-name">📄 {facturaPdf.name}</span>
                  <button onClick={() => setFacturaPdf(null)} className="factura-remove">✕</button>
                </div>
              ) : (
                <span className="no-data">No adjuntado</span>
              )}
            </div>
            {getFactura(document.id) && (
              <div className="info-item full">
                <input
                  type="file"
                  ref={facturaInputRef}
                  onChange={handleFacturaUpload}
                  accept=".pdf"
                  hidden
                />
                <button
                  onClick={() => facturaInputRef.current?.click()}
                  className="btn-upload-factura"
                >
                  📎 {facturaPdf ? 'Cambiar PDF de Factura' : 'Subir PDF de Factura'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Información Financiera */}
        <div className="detail-section">
          <h2>Información Financiera</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Precio Unitario</label>
              <span>{document.precio_unitario ? `${document.precio_unitario} ${document.divisa || ''}` : '-'}</span>
            </div>
            <div className="info-item">
              <label>Precio Final</label>
              <span>{document.precio_final ? `${document.precio_final} ${document.divisa || ''}` : '-'}</span>
            </div>
            <div className="info-item">
              <label>Costo Unitario</label>
              <span>{document.pcosto ? `${document.pcosto} ${document.divisa_cost || ''}` : '-'}</span>
            </div>
            <div className="info-item">
              <label>Costo Final</label>
              <span>{document.costo_final ? `${document.costo_final} ${document.divisa_cost || ''}` : '-'}</span>
            </div>
            <div className="info-item">
              <label>Margen Operativo</label>
              <span>{document.margen_operativo || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetail;
