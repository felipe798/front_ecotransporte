import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './EditDocument.css';

const EditDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    ticket: '',
    factura: '',
    tn_recibida: '',
    tn_recibida_data_cruda: '',
  });
  const [document, setDocument] = useState(null);

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
        tn_recibida: doc.tn_recibida || '',
        tn_recibida_data_cruda: doc.tn_recibida_data_cruda || '',
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
      // Enviar ticket y datos de TN recibida
      const updateData = {
        ticket: formData.ticket,
        factura: formData.factura || null,
        tn_recibida: formData.tn_recibida ? Number(formData.tn_recibida) : null,
        tn_recibida_data_cruda: formData.tn_recibida_data_cruda ? Number(formData.tn_recibida_data_cruda) : null,
      };
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
        <Link to={`/documents/${id}`} className="back-link">← Volver</Link>
        <div className="header-title-row">
          <h1>
            <span className="lock-badge">🔒</span>
            Editar Datos del Ticket
          </h1>
        </div>
        <p className="document-code">{document?.grt}</p>
      </div>

      <div className="locked-notice">
        <span className="lock-icon-large">🔒</span>
        <div className="locked-text">
          <strong>Documento bloqueado</strong>
          <p>Solo puedes editar los datos del ticket: número de ticket y tonelaje recibido.</p>
        </div>
      </div>

      <div className="edit-info">
        <div className="info-row">
          <span className="label">Fecha:</span>
          <span>{document?.fecha}</span>
        </div>
        <div className="info-row">
          <span className="label">Transportista:</span>
          <span>{document?.transportista}</span>
        </div>
        <div className="info-row">
          <span className="label">TN Enviado:</span>
          <span>{document?.tn_enviado}</span>
        </div>
        {document?.uploader && (
          <div className="info-row">
            <span className="label">Subido por:</span>
            <span>{document.uploader.userInformation?.userName || document.uploader.email}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="edit-form">
        {error && <div className="error-message">{error}</div>}

        {/* Campo de Ticket - Único editable */}
        <div className="form-section">
          <h2>📝 Datos del Ticket (Editables)</h2>
          <div className="form-grid">
            <div className="form-group ticket-highlight">
              <label htmlFor="ticket">
                Ticket
                <span className="editable-badge">Editable</span>
              </label>
              <input
                type="text"
                id="ticket"
                name="ticket"
                value={formData.ticket}
                onChange={handleChange}
                placeholder="Número de ticket"
                className="ticket-input"
              />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="factura">
                ID de Factura
                <span className="editable-badge">Editable</span>
              </label>
              <input
                type="text"
                id="factura"
                name="factura"
                value={formData.factura}
                onChange={handleChange}
                placeholder="Ej: F001-00001234"
                className="ticket-input"
              />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="tn_recibida">
                TN Recibida
                <span className="editable-badge">Editable</span>
              </label>
              <input
                type="number"
                step="0.01"
                id="tn_recibida"
                name="tn_recibida"
                value={formData.tn_recibida}
                onChange={handleChange}
                placeholder="Tonelaje recibido"
                className="ticket-input"
              />
            </div>
            <div className="form-group ticket-highlight">
              <label htmlFor="tn_recibida_data_cruda">
                TN Recibida (Data Cruda)
                <span className="editable-badge">Editable</span>
              </label>
              <input
                type="number"
                step="0.01"
                id="tn_recibida_data_cruda"
                name="tn_recibida_data_cruda"
                value={formData.tn_recibida_data_cruda}
                onChange={handleChange}
                placeholder="Tonelaje crudo del ticket"
                className="ticket-input"
              />
            </div>
          </div>
        </div>

        {/* Mostrar valores como solo lectura */}
        <div className="form-section locked-section">
          <h2>🔒 Datos del Documento (Solo Lectura)</h2>
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

        <div className="form-actions">
          <Link to={`/documents/${id}`} className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDocument;
