import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import logoEmpresa from '../assets/Images/logo-empresa.png';
import './Documents.css';
import FileDropdown from '../components/FileDropdown';

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openFilesFor, setOpenFilesFor] = useState(null);
  const PAGE_SIZE = 20;
  const notification = useNotification();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentService.getAll();
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;
    
    setDeleteId(id);
    try {
      await documentService.delete(id);
      setDocuments(documents.filter(doc => doc.id !== id));
      notification.success('Documento eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando documento:', error);
      notification.error('Error al eliminar el documento');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.grt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.transportista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.grr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.factura?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDocuments.length / PAGE_SIZE);
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="documents-header">
        <div className="header-title">
          <img src={logoEmpresa} alt="Logo Empresa" className="page-logo" />
          <h1>Documentos</h1>
        </div>
        <div className="documents-actions">
          <input
            type="text"
            placeholder="Buscar por GRT, transportista, cliente..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {user?.role === 1 && (
            <Link to="/upload" className="btn-upload">
              + Subir PDF
            </Link>
          )}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <p>{searchTerm ? 'No se encontraron documentos' : 'No hay documentos aún'}</p>
          {!searchTerm && user?.role === 1 && (
            <Link to="/upload" className="btn-primary">Subir tu primer PDF</Link>
          )}
        </div>
      ) : (
        <div className="documents-table-container">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Archivos</th>
                <th></th>
                <th>Fecha</th>
                <th>GRT</th>
                <th>GRR</th>
                <th>Conductor</th>
                <th>TN Recibido</th>
                <th>Cliente</th>
                <th>Factura</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocuments.map((doc) => (
                <>
                  <tr key={doc.id} className={doc.anulado ? 'row-anulado' : ''}>
                    <td className="files-cell">
                      <button
                        className="btn-files"
                        onClick={() => setOpenFilesFor(openFilesFor === doc.id ? null : doc.id)}
                        title="Administrar archivos"
                      >
                        📎
                      </button>
                    </td>
                    <td className="lock-cell">
                    {doc.anulado ? (
                      <span className="anulado-icon" title="Documento anulado">🚫</span>
                    ) : (
                      <span className="lock-icon" title="Documento bloqueado - Solo editable el ticket">🔒</span>
                    )}
                  </td>
                  <td>{doc.fecha}</td>
                  <td className="code">{doc.grt}</td>
                  <td className="code">{doc.grr}</td>
                  <td>{doc.transportista}</td>
                  <td className="number">{doc.tn_recibida}</td>
                  <td>{doc.cliente}</td>
                  <td className="code factura-cell">{doc.factura || <span className="no-factura">—</span>}</td>
                  <td className="actions">
                    <Link to={`/documents/${doc.id}`} className="btn-action btn-view" title="Ver detalle">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </Link>
                    <Link to={`/documents/${doc.id}/edit`} className="btn-action btn-edit" title="Editar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </Link>
                    {user?.role === 1 && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn-action btn-delete"
                        disabled={deleteId === doc.id}
                        title="Eliminar"
                      >
                        {deleteId === doc.id ? '...' : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
                      </button>
                    )}
                    </td>
                  </tr>
                  {openFilesFor === doc.id && (
                    <tr className="files-row">
                      <td colSpan="10">
                        <FileDropdown
                          document={doc}
                          onUpdate={(updated) => {
                            setDocuments(docs => docs.map(x => x.id === updated.id ? updated : x));
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&laquo;</button>
          <button className="page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>&lsaquo;</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === '...' ? (
                <span key={`ellipsis-${idx}`} className="page-ellipsis">&#8230;</span>
              ) : (
                <button
                  key={item}
                  className={`page-btn${currentPage === item ? ' active' : ''}`}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}
          <button className="page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>&rsaquo;</button>
          <button className="page-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&raquo;</button>
        </div>
      )}

      <div className="documents-count">
        Mostrando {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredDocuments.length)} de {filteredDocuments.length} documentos
        {documents.length !== filteredDocuments.length && ` (filtrados de ${documents.length})`}
      </div>
    </div>
  );
};

export default Documents;
