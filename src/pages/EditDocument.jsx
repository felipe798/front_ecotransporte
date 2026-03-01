import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './EditDocument.css';

const DIVISAS = ['USD', 'PEN'];

const EditDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.role === 1;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [document, setDocument] = useState(null);

  const [formData, setFormData] = useState({
    ticket: '',
    factura: '',
    tn_recibida: '',
    tn_recibida_data_cruda: '',
    fecha: '',
    mes: '',
    semana: '',
    grt: '',
    grr: '',
    transportista: '',
    unidad: '',
    empresa: '',
    tn_enviado: '',
    deposito: '',
    cliente: '',
    partida: '',
    llegada: '',
    transportado: '',
    precio_unitario: '',
    divisa: 'USD',
    precio_final: '',
    pcosto: '',
    divisa_cost: 'USD',
    costo_final: '',
    margen_operativo: '',
  });

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      const response = await documentService.getById(id);
      const doc = response.data;
      setDocument(doc);
      setFormData({
        ticket: doc.ticket || '',
        factura: doc.factura || '',
        tn_recibida: doc.tn_recibida ?? '',
        tn_recibida_data_cruda: doc.tn_recibida_data_cruda ?? '',
        fecha: doc.fecha ? doc.fecha.toString().substring(0, 10) : '',
        mes: doc.mes || '',
        semana: doc.semana || '',
        grt: doc.grt || '',
        grr: doc.grr || '',
        transportista: doc.transportista || '',
        unidad: doc.unidad || '',
        empresa: doc.empresa || '',
        tn_enviado: doc.tn_enviado ?? '',
        deposito: doc.deposito || '',
        cliente: doc.cliente || '',
        partida: doc.partida || '',
        llegada: doc.llegada || '',
        transportado: doc.transportado || '',
        precio_unitario: doc.precio_unitario ?? '',
        divisa: doc.divisa || 'USD',
        precio_final: doc.precio_final ?? '',
        pcosto: doc.pcosto ?? '',
        divisa_cost: doc.divisa_cost || 'USD',
        costo_final: doc.costo_final ?? '',
        margen_operativo: doc.margen_operativo ?? '',
      });
    } catch (err) {
      setError('Documento no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let updateData;
      if (isAdmin) {
        updateData = {
          ticket: formData.ticket || null,
          factura: formData.factura || null,
          tn_recibida: formData.tn_recibida !== '' ? Number(formData.tn_recibida) : null,
          tn_recibida_data_cruda: formData.tn_recibida_data_cruda !== '' ? Number(formData.tn_recibida_data_cruda) : null,
          fecha: formData.fecha || null,
          mes: formData.mes || null,
          semana: formData.semana || null,
          grt: formData.grt || null,
          grr: formData.grr || null,
          transportista: formData.transportista || null,
          unidad: formData.unidad || null,
          empresa: formData.empresa || null,
          tn_enviado: formData.tn_enviado !== '' ? Number(formData.tn_enviado) : null,
          deposito: formData.deposito || null,
          cliente: formData.cliente || null,
          partida: formData.partida || null,
          llegada: formData.llegada || null,
          transportado: formData.transportado || null,
          precio_unitario: formData.precio_unitario !== '' ? Number(formData.precio_unitario) : null,
          divisa: formData.divisa || null,
          precio_final: formData.precio_final !== '' ? Number(formData.precio_final) : null,
          pcosto: formData.pcosto !== '' ? Number(formData.pcosto) : null,
          divisa_cost: formData.divisa_cost || null,
          costo_final: formData.costo_final !== '' ? Number(formData.costo_final) : null,
          margen_operativo: formData.margen_operativo !== '' ? Number(formData.margen_operativo) : null,
        };
      } else {
        updateData = {
          ticket: formData.ticket || null,
          factura: formData.factura || null,
          tn_recibida: formData.tn_recibida !== '' ? Number(formData.tn_recibida) : null,
          tn_recibida_data_cruda: formData.tn_recibida_data_cruda !== '' ? Number(formData.tn_recibida_data_cruda) : null,
        };
      }

      await documentService.update(id, updateData);
      notification.success('Datos guardados correctamente');
      navigate(`/documents/${id}`);
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios');
      notification.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
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

  if (error && !document) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <Link to="/documents" className="btn-primary">Volver a documentos</Link>
      </div>
    );
  }

  return (
    <div className="edit-document">
      <div className="edit-header">
        <Link to={`/documents/${id}`} className="back-link">â† Volver</Link>
        <div className="header-title-row">
          <h1>
            <span className="lock-badge">{isAdmin ? 'âœï¸' : 'ðŸ”’'}</span>
            {isAdmin ? 'Editar Documento (Admin)' : 'Editar Datos del Ticket'}
          </h1>
        </div>
        <p className="document-code">{document?.grt}</p>
      </div>

      {/* AuditorÃ­a: quiÃ©n editÃ³ por Ãºltima vez */}
      {document?.updater && (
        <div className="edit-audit-bar">
          <span>âœï¸ Ãšltima ediciÃ³n por <strong>{document.updater?.userInformation?.userName || document.updater?.email}</strong></span>
          {document.updated_at && (
            <span className="audit-date"> Â· {new Date(document.updated_at).toLocaleString('es-PE')}</span>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="locked-notice">
          <span className="lock-icon-large">ðŸ”’</span>
          <div className="locked-text">
            <strong>Documento bloqueado</strong>
            <p>Solo puedes editar los datos del ticket: nÃºmero de ticket y tonelaje recibido.</p>
          </div>
        </div>
      )}

      {isAdmin && !document?.precio_unitario && (
        <div className="admin-warning-notice">
          <span>âš ï¸</span>
          <div>
            <strong>Documento incompleto</strong>
            <p>Este documento no tiene tarifa asignada. Puedes completar los campos financieros manualmente.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-form">
        {error && <div className="error-message">{error}</div>}

        {/* ===== DATOS DEL TICKET (todos) ===== */}
        <div className="form-section">
          <h2>ðŸ“ Datos del Ticket</h2>
          <div className="form-grid">
            <div className="form-group ticket-highlight">
              <label htmlFor="ticket">Ticket <span className="editable-badge">Editable</span></label>
              <input type="text" id="ticket" name="ticket" value={formData.ticket} onChange={handleChange} placeholder="NÃºmero de ticket" className="ticket-input" />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="factura">ID de Factura <span className="editable-badge">Editable</span></label>
              <input type="text" id="factura" name="factura" value={formData.factura} onChange={handleChange} placeholder="Ej: F001-00001234" className="ticket-input" />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="tn_recibida">TN Recibida <span className="editable-badge">Editable</span></label>
              <input type="number" step="0.01" id="tn_recibida" name="tn_recibida" value={formData.tn_recibida} onChange={handleChange} placeholder="Tonelaje recibido" className="ticket-input" />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="tn_recibida_data_cruda">TN Recibida (Data Cruda) <span className="editable-badge">Editable</span></label>
              <input type="number" step="0.01" id="tn_recibida_data_cruda" name="tn_recibida_data_cruda" value={formData.tn_recibida_data_cruda} onChange={handleChange} placeholder="Tonelaje crudo del ticket" className="ticket-input" />
            </div>
          </div>
        </div>

        {/* ===== ADMIN: DATOS DEL PDF ===== */}
        {isAdmin && (
          <>
            <div className="form-section admin-section">
              <h2>ðŸ”§ Datos del Documento <span className="admin-badge">Solo Admin</span></h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="mes">Mes</label>
                  <input type="text" id="mes" name="mes" value={formData.mes} onChange={handleChange} placeholder="enero, febrero..." />
                </div>
                <div className="form-group">
                  <label htmlFor="semana">Semana</label>
                  <input type="text" id="semana" name="semana" value={formData.semana} onChange={handleChange} placeholder="1, 2, 3..." />
                </div>
                <div className="form-group">
                  <label htmlFor="grt">GRT</label>
                  <input type="text" id="grt" name="grt" value={formData.grt} onChange={handleChange} placeholder="VVV1-000000" />
                </div>
                <div className="form-group">
                  <label htmlFor="grr">GRR</label>
                  <input type="text" id="grr" name="grr" value={formData.grr} onChange={handleChange} placeholder="EG07-00000" />
                </div>
                <div className="form-group">
                  <label htmlFor="transportista">Transportista</label>
                  <input type="text" id="transportista" name="transportista" value={formData.transportista} onChange={handleChange} placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                  <label htmlFor="unidad">Placa (Unidad)</label>
                  <input type="text" id="unidad" name="unidad" value={formData.unidad} onChange={handleChange} placeholder="ABC123" />
                </div>
                <div className="form-group">
                  <label htmlFor="empresa">Empresa</label>
                  <input type="text" id="empresa" name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Nombre de empresa" />
                </div>
                <div className="form-group">
                  <label htmlFor="tn_enviado">TN Enviado</label>
                  <input type="number" step="0.01" id="tn_enviado" name="tn_enviado" value={formData.tn_enviado} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="deposito">DepÃ³sito</label>
                  <input type="text" id="deposito" name="deposito" value={formData.deposito} onChange={handleChange} placeholder="IMPALA / LOGIMINSA" />
                </div>
              </div>
            </div>

            <div className="form-section admin-section">
              <h2>ðŸ“ Ruta y Carga <span className="admin-badge">Solo Admin</span></h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="cliente">Cliente</label>
                  <input type="text" id="cliente" name="cliente" value={formData.cliente} onChange={handleChange} placeholder="NOMBRE S.A.C." />
                </div>
                <div className="form-group">
                  <label htmlFor="partida">Punto de Partida</label>
                  <input type="text" id="partida" name="partida" value={formData.partida} onChange={handleChange} placeholder="REGION-PROVINCIA-DISTRITO" />
                </div>
                <div className="form-group">
                  <label htmlFor="llegada">Punto de Llegada</label>
                  <input type="text" id="llegada" name="llegada" value={formData.llegada} onChange={handleChange} placeholder="REGION-PROVINCIA-DISTRITO" />
                </div>
                <div className="form-group">
                  <label htmlFor="transportado">Material Transportado</label>
                  <input type="text" id="transportado" name="transportado" value={formData.transportado} onChange={handleChange} placeholder="CONCENTRADO DE ZN..." />
                </div>
              </div>
            </div>

            <div className="form-section admin-section">
              <h2>ðŸ’° Datos Financieros <span className="admin-badge">Solo Admin</span></h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="precio_unitario">Precio Unitario</label>
                  <input type="number" step="0.01" id="precio_unitario" name="precio_unitario" value={formData.precio_unitario} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="divisa">Moneda Venta</label>
                  <select id="divisa" name="divisa" value={formData.divisa} onChange={handleChange}>
                    {DIVISAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="precio_final">Precio Final</label>
                  <input type="number" step="0.01" id="precio_final" name="precio_final" value={formData.precio_final} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="pcosto">Costo Unitario</label>
                  <input type="number" step="0.01" id="pcosto" name="pcosto" value={formData.pcosto} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="divisa_cost">Moneda Costo</label>
                  <select id="divisa_cost" name="divisa_cost" value={formData.divisa_cost} onChange={handleChange}>
                    {DIVISAS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="costo_final">Costo Final</label>
                  <input type="number" step="0.01" id="costo_final" name="costo_final" value={formData.costo_final} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="margen_operativo">Margen Operativo</label>
                  <input type="number" step="0.01" id="margen_operativo" name="margen_operativo" value={formData.margen_operativo} onChange={handleChange} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* No-admin: solo lectura del resto */}
        {!isAdmin && (
          <div className="form-section locked-section">
            <h2>ðŸ”’ Datos del Documento (Solo Lectura)</h2>
            <div className="readonly-grid">
              <div className="readonly-item">
                <span className="readonly-label">TN Enviado:</span>
                <span className="readonly-value">{document?.tn_enviado || '-'}</span>
              </div>
              <div className="readonly-item">
                <span className="readonly-label">Precio Unitario:</span>
                <span className="readonly-value">{document?.precio_unitario || '-'} {document?.divisa}</span>
              </div>
              <div className="readonly-item">
                <span className="readonly-label">Precio Final:</span>
                <span className="readonly-value">{document?.precio_final || '-'}</span>
              </div>
              <div className="readonly-item">
                <span className="readonly-label">Costo Unitario:</span>
                <span className="readonly-value">{document?.pcosto || '-'} {document?.divisa_cost}</span>
              </div>
              <div className="readonly-item">
                <span className="readonly-label">Costo Final:</span>
                <span className="readonly-value">{document?.costo_final || '-'}</span>
              </div>
              <div className="readonly-item">
                <span className="readonly-label">Margen Operativo:</span>
                <span className="readonly-value">{document?.margen_operativo || '-'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <Link to={`/documents/${id}`} className="btn-secondary">Cancelar</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDocument;
