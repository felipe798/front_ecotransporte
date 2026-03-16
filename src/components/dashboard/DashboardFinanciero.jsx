import { useState, useEffect, useRef } from 'react';
import { dashboardService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, LabelList
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import XLSX from 'xlsx-js-style';
import './DashboardComponents.css';

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Colores para divisas - contrastantes
const COLORS = {
  PEN: '#1B7430',    // Verde principal para Soles
  USD: '#4A86B8',    // Azul medio para Dólares
  dolares: '#4A86B8',
  soles: '#1B7430',
};

// Paleta de colores equilibrada para gráficos
const CHART_COLORS = [
  '#1B7430', // Verde principal
  '#4A86B8', // Azul medio
  '#C4883A', // Dorado suave
  '#8E6BAD', // Lila
  '#3A9E9E', // Teal medio
  '#C06050', // Terracota
  '#5D8A5D', // Verde salvia
  '#6882A8', // Azul grisáceo
  '#B87840', // Bronce
  '#9E6575'  // Rosa antiguo
];

// SVG path for bar with rounded end (right for positive, left for negative)
const roundedBarPath = (x, y, w, h) => {
  if (!w || !h) return '';
  const r = Math.min(4, Math.abs(w) / 2, h / 2);
  if (w >= 0) {
    return `M${x},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} L${x},${y+h} Z`;
  }
  const ax = x + w;
  return `M${x},${y} L${x},${y+h} L${ax+r},${y+h} Q${ax},${y+h} ${ax},${y+h-r} L${ax},${y+r} Q${ax},${y} ${ax+r},${y} Z`;
};

// Custom bar shape that centers when the other currency is absent
const makeCenteredBar = (dataKey, otherKey, color, fmtLabel) => (props) => {
  const { x, y, width, height, payload } = props;
  if (!width || Math.abs(width) < 0.5) return null;
  const value = payload[dataKey];
  const otherValue = payload[otherKey];
  const hasOther = otherValue != null && otherValue !== 0;
  // USD=top bar, PEN=bottom bar; center if other is missing
  const adjustedY = hasOther ? y : (dataKey === 'USD' ? y + height / 2 : y - height / 2);
  const d = roundedBarPath(x, adjustedY, width, height);
  const label = fmtLabel(value);
  const labelX = width >= 0 ? x + width + 5 : x + width - 5;
  const anchor = width >= 0 ? 'start' : 'end';
  return (
    <g>
      <path d={d} fill={color} />
      {label && (
        <text x={labelX} y={adjustedY + height / 2} dy="0.35em" fill={color} fontSize={10} fontWeight={600} textAnchor={anchor}>
          {label}
        </text>
      )}
    </g>
  );
};

const CobrarUsdBar = makeCenteredBar('USD', 'PEN', COLORS.USD, v => v > 0 ? `$ ${fmtNum(v)}` : '');
const CobrarPenBar = makeCenteredBar('PEN', 'USD', COLORS.PEN, v => v > 0 ? `S/ ${fmtNum(v)}` : '');
const MargenUsdBar = makeCenteredBar('USD', 'PEN', COLORS.USD, v => v !== 0 ? `$ ${fmtNum(v)}` : '');
const MargenPenBar = makeCenteredBar('PEN', 'USD', COLORS.PEN, v => v !== 0 ? `S/ ${fmtNum(v)}` : '');

const DashboardFinanciero = ({ filters }) => {
  const isMobile = useIsMobile();
  const [porCobrar, setPorCobrar] = useState([]);
  const [porPagar, setPorPagar] = useState([]);
  const [margenOperativo, setMargenOperativo] = useState([]);
  const [tnClienteEmpresa, setTnClienteEmpresa] = useState([]);
  const [seguimiento, setSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cobrar');
  const tnSectionRef = useRef(null);
  const pagarSectionRef = useRef(null);
  const cobrarSectionRef = useRef(null);
  const margenSectionRef = useRef(null);
  const segSectionRef = useRef(null);
  const [exportingTnPdf, setExportingTnPdf] = useState(false);
  const [exportingPagarPdf, setExportingPagarPdf] = useState(false);
  const [exportingCobrarPdf, setExportingCobrarPdf] = useState(false);
  const [exportingMargenPdf, setExportingMargenPdf] = useState(false);
  const [exportingSegPdf, setExportingSegPdf] = useState(false);

  const [localFilters, setLocalFilters] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptions, setFilterOptions] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [localFiltersPagar, setLocalFiltersPagar] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsPagar, setFilterOptionsPagar] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingPagar, setFiltersLoadingPagar] = useState(false);

  const [localFiltersMargen, setLocalFiltersMargen] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsMargen, setFilterOptionsMargen] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingMargen, setFiltersLoadingMargen] = useState(false);

  const [localFiltersTn, setLocalFiltersTn] = useState({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  const [filterOptionsTn, setFilterOptionsTn] = useState({ meses: [], semanas: [], clientes: [], transportistas: [], unidades: [], divisas: [] });
  const [filtersLoadingTn, setFiltersLoadingTn] = useState(false);

  const [localFiltersSeg, setLocalFiltersSeg] = useState({ mes: '', semana: '', cliente: '', unidad: '' });
  const [filterOptionsSeg, setFilterOptionsSeg] = useState({ meses: [], semanas: [], clientes: [], unidades: [] });
  const [filtersLoadingSeg, setFiltersLoadingSeg] = useState(false);

  const getActiveFilters = () => {
    const active = {};
    Object.entries(localFilters).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const data = await dashboardService.getSegmentadoresFiltrados({});
        const opts = {
          meses: data.meses || [],
          semanas: data.semanas || [],
          clientes: data.clientes || [],
          transportistas: data.transportistas || [],
          unidades: data.unidades || [],
          divisas: data.divisas || [],
        };
        setFilterOptions(opts);
        setFilterOptionsPagar(opts);
        setFilterOptionsMargen(opts);
        setFilterOptionsTn(opts);
        setFilterOptionsSeg({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], unidades: data.unidades || [] });
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  useEffect(() => {
    loadCobrar();
  }, [localFilters]);

  useEffect(() => {
    loadPagar();
  }, [localFiltersPagar]);

  useEffect(() => {
    loadMargen();
  }, [localFiltersMargen]);

  useEffect(() => {
    loadTnClienteEmpresa();
  }, [localFiltersTn]);

  useEffect(() => {
    if (localFiltersSeg.mes) loadSeguimiento();
    else setSeguimiento([]);
  }, [localFiltersSeg]);

  const getActivePagarFilters = () => {
    const active = {};
    Object.entries(localFiltersPagar).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadCobrar = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveFilters();
      const cobrar = await dashboardService.getPorCobrar(activeFilters);
      setPorCobrar((cobrar || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Por Cobrar:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPagar = async () => {
    setLoading(true);
    try {
      const activeFilters = getActivePagarFilters();
      const pagar = await dashboardService.getPorPagar(activeFilters);
      setPorPagar((pagar || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Por Pagar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveMargenFilters = () => {
    const active = {};
    Object.entries(localFiltersMargen).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadMargen = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveMargenFilters();
      const margen = await dashboardService.getMargenOperativo(activeFilters);
      setMargenOperativo((margen || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando Margen Operativo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveTnFilters = () => {
    const active = {};
    Object.entries(localFiltersTn).forEach(([k, v]) => { if (v) active[k] = v; });
    return active;
  };

  const loadTnClienteEmpresa = async () => {
    setLoading(true);
    try {
      const activeFilters = getActiveTnFilters();
      const tnCE = await dashboardService.getTnClienteEmpresa(activeFilters);
      setTnClienteEmpresa((tnCE || []).map(item => ({ ...item, total: parseFloat(item.total) || 0 })));
    } catch (error) {
      console.error('Error cargando TN Recibido:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeguimiento = async () => {
    setLoading(true);
    try {
      const active = {};
      Object.entries(localFiltersSeg).forEach(([k, v]) => { if (v) active[k] = v; });
      const seg = await dashboardService.getSeguimientoTransporte(active);
      setSeguimiento(seg || []);
    } catch (error) {
      console.error('Error cargando Seguimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChangeSeg = async (key, value) => {
    const newFilters = { ...localFiltersSeg, [key]: value };
    setFiltersLoadingSeg(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        unidades: data.unidades || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      setFilterOptionsSeg(newOptions);
      setLocalFiltersSeg(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingSeg(false); }
  };

  const clearFiltersSeg = async () => {
    setFiltersLoadingSeg(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsSeg({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], unidades: data.unidades || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingSeg(false); }
    setLocalFiltersSeg({ mes: '', semana: '', cliente: '', unidad: '' });
  };

  const handleFilterChange = async (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setFiltersLoading(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptions(newOptions);
      setLocalFilters(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoading(false); }
  };

  const clearFilters = async () => {
    setFiltersLoading(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptions({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoading(false); }
    setLocalFilters({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangePagar = async (key, value) => {
    const newFilters = { ...localFiltersPagar, [key]: value };
    setFiltersLoadingPagar(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsPagar(newOptions);
      setLocalFiltersPagar(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingPagar(false); }
  };

  const clearFiltersPagar = async () => {
    setFiltersLoadingPagar(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsPagar({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingPagar(false); }
    setLocalFiltersPagar({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangeMargen = async (key, value) => {
    const newFilters = { ...localFiltersMargen, [key]: value };
    setFiltersLoadingMargen(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsMargen(newOptions);
      setLocalFiltersMargen(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingMargen(false); }
  };

  const clearFiltersMargen = async () => {
    setFiltersLoadingMargen(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsMargen({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingMargen(false); }
    setLocalFiltersMargen({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  const handleFilterChangeTn = async (key, value) => {
    const newFilters = { ...localFiltersTn, [key]: value };
    setFiltersLoadingTn(true);
    try {
      const active = {};
      Object.entries(newFilters).forEach(([k, v]) => { if (v) active[k] = v; });
      const data = await dashboardService.getSegmentadoresFiltrados(active);
      const newOptions = {
        meses: data.meses || [],
        semanas: data.semanas || [],
        clientes: data.clientes || [],
        transportistas: data.transportistas || [],
        unidades: data.unidades || [],
        divisas: data.divisas || [],
      };
      const validated = { ...newFilters };
      if (validated.mes && !newOptions.meses.includes(validated.mes)) validated.mes = '';
      if (validated.semana && !newOptions.semanas.includes(validated.semana)) validated.semana = '';
      if (validated.cliente && !newOptions.clientes.includes(validated.cliente)) validated.cliente = '';
      if (validated.transportista && !newOptions.transportistas.includes(validated.transportista)) validated.transportista = '';
      if (validated.unidad && !newOptions.unidades.includes(validated.unidad)) validated.unidad = '';
      if (validated.divisa && !newOptions.divisas.includes(validated.divisa)) validated.divisa = '';
      setFilterOptionsTn(newOptions);
      setLocalFiltersTn(validated);
    } catch (e) { console.error(e); } finally { setFiltersLoadingTn(false); }
  };

  const clearFiltersTn = async () => {
    setFiltersLoadingTn(true);
    try {
      const data = await dashboardService.getSegmentadoresFiltrados({});
      setFilterOptionsTn({ meses: data.meses || [], semanas: data.semanas || [], clientes: data.clientes || [], transportistas: data.transportistas || [], unidades: data.unidades || [], divisas: data.divisas || [] });
    } catch (e) { console.error(e); } finally { setFiltersLoadingTn(false); }
    setLocalFiltersTn({ mes: '', semana: '', cliente: '', transportista: '', unidad: '', divisa: '' });
  };

  // Normalizar divisa a USD o PEN
  const normalizeDivisa = (divisa) => {
    if (!divisa) return 'PEN';
    const d = divisa.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (d.includes('dolar') || d.includes('dollar') || d === 'usd') return 'USD';
    if (d.includes('sol') || d === 'pen') return 'PEN';
    return 'USD';
  };

  // Helper: inyectar título con filtros al ref, capturar, y luego removerlo
  const pdfWithTitle = async (ref, sectionTitle, filterObj, orientationOverride) => {
    const filterParts = [];
    if (filterObj.mes) filterParts.push(filterObj.mes);
    if (filterObj.semana) filterParts.push(`Semana ${filterObj.semana}`);
    if (filterObj.cliente) filterParts.push(filterObj.cliente);
    if (filterObj.transportista) filterParts.push(filterObj.transportista);
    if (filterObj.unidad) filterParts.push(`Placa: ${filterObj.unidad}`);
    if (filterObj.divisa) filterParts.push(filterObj.divisa);
    const subtitle = filterParts.length > 0 ? filterParts.join(' — ') : 'General';

    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'text-align:center;padding:16px 0 12px;border-bottom:2px solid #1B7430;margin-bottom:12px;';
    titleDiv.innerHTML = `<div style="font-size:22px;font-weight:800;color:#1B7430;">${sectionTitle}</div><div style="font-size:14px;color:#333;margin-top:6px;">${subtitle}</div>`;
    ref.current.insertBefore(titleDiv, ref.current.firstChild);

    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#f5f5f5' });
      const imgData = canvas.toDataURL('image/png');
      const orientation = orientationOverride || (canvas.width > canvas.height ? 'landscape' : 'portrait');
      const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      return pdf;
    } finally {
      ref.current.removeChild(titleDiv);
    }
  };

  const descargarCobrarPDF = async () => {
    if (!cobrarSectionRef.current) return;
    setExportingCobrarPdf(true);
    try {
      const pdf = await pdfWithTitle(cobrarSectionRef, 'Por Cobrar', localFilters);
      pdf.save('Por_Cobrar.pdf');
    } catch (err) { console.error('Error generando PDF:', err); }
    finally { setExportingCobrarPdf(false); }
  };

  const descargarCobrarExcel = () => {
    if (porCobrar.length === 0) return;
    const wb = XLSX.utils.book_new();
    const hStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: '145A25' } } } };
    const cellL = { font: { sz: 10 }, alignment: { horizontal: 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellR = { font: { sz: 10 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const rows = [
      [{ v: 'Cliente', s: hStyle }, { v: 'Empresa', s: hStyle }, { v: 'Divisa', s: hStyle }, { v: 'Por Cobrar', s: hStyle }],
      ...porCobrar.map(item => [
        { v: item.cliente || 'Sin cliente', s: cellL },
        { v: formatEmpresa(item.empresa), s: cellL },
        { v: item.divisa || 'PEN', s: cellL },
        { v: Math.round((Number(item.total) || 0) * 100) / 100, t: 'n', s: cellR },
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Por Cobrar');
    XLSX.writeFile(wb, 'Por_Cobrar.xlsx');
  };

  const descargarMargenPDF = async () => {
    if (!margenSectionRef.current) return;
    setExportingMargenPdf(true);
    try {
      const pdf = await pdfWithTitle(margenSectionRef, 'Margen Operativo', localFiltersMargen);
      pdf.save('Margen_Operativo.pdf');
    } catch (err) { console.error('Error generando PDF:', err); }
    finally { setExportingMargenPdf(false); }
  };

  const descargarMargenExcel = () => {
    if (margenOperativo.length === 0) return;
    const wb = XLSX.utils.book_new();
    const hStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A86B8' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: '3A6E9A' } } } };
    const cellL = { font: { sz: 10 }, alignment: { horizontal: 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellPos = { font: { sz: 10, color: { rgb: '1B7430' } }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellNeg = { font: { sz: 10, color: { rgb: 'CC3333' } }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const rows = [
      [{ v: 'Cliente', s: hStyle }, { v: 'Empresa', s: hStyle }, { v: 'Divisa', s: hStyle }, { v: 'Margen Operativo', s: hStyle }],
      ...margenOperativo.map(item => {
        const val = Math.round((Number(item.total) || 0) * 100) / 100;
        return [
          { v: item.cliente || 'Sin cliente', s: cellL },
          { v: formatEmpresa(item.empresa), s: cellL },
          { v: item.divisa || 'PEN', s: cellL },
          { v: val, t: 'n', s: val >= 0 ? cellPos : cellNeg },
        ];
      })
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 10 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Margen Operativo');
    XLSX.writeFile(wb, 'Margen_Operativo.xlsx');
  };

  const descargarSegPDF = async () => {
    if (!segSectionRef.current) return;
    setExportingSegPdf(true);
    try {
      const pdf = await pdfWithTitle(segSectionRef, 'Seguimiento de Transporte', localFiltersSeg, 'landscape');
      pdf.save('Seguimiento_Transporte.pdf');
    } catch (err) { console.error('Error generando PDF:', err); }
    finally { setExportingSegPdf(false); }
  };

  const descargarSegExcel = () => {
    if (seguimiento.length === 0) return;
    const sData = prepareSeguimientoData(seguimiento);
    const wb = XLSX.utils.book_new();
    const hStyle = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: '145A25' } } } };
    const hSem = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A86B8' } }, alignment: { horizontal: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: '3A6E9A' } } } };
    const hTotal = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'C4883A' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'medium', color: { rgb: 'A06B2D' } } } };
    const cellL = { font: { sz: 10 }, alignment: { horizontal: 'left' }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellN = { font: { sz: 10 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };
    const cellT = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'right' }, numFmt: '#,##0.00', fill: { fgColor: { rgb: 'FFF8E1' } }, border: { bottom: { style: 'thin', color: { rgb: 'E0E0E0' } } } };

    const header = [
      { v: 'Cliente', s: hStyle },
      { v: 'Empresa', s: hStyle },
      { v: 'Placa', s: hStyle },
      ...sData.semanas.map(s => ({ v: `Sem. ${s} (TN Rec.)`, s: hSem })),
      { v: 'Total (TN)', s: hTotal },
    ];
    const rows = [header];

    for (const row of sData.rows) {
      const total = sData.semanas.reduce((sum, s) => sum + (row[s] || 0), 0);
      rows.push([
        { v: row.cliente || 'Sin cliente', s: cellL },
        { v: formatEmpresa(row.empresa), s: cellL },
        { v: row.placa || '', s: cellL },
        ...sData.semanas.map(s => row[s] ? { v: Math.round((Number(row[s]) || 0) * 100) / 100, t: 'n', s: cellN } : { v: '', s: cellL }),
        { v: Math.round(total * 100) / 100, t: 'n', s: cellT },
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 10 }, ...sData.semanas.map(() => ({ wch: 16 })), { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento');
    XLSX.writeFile(wb, 'Seguimiento_Transporte.xlsx');
  };

  const descargarPagarPDF = async () => {
    if (!pagarSectionRef.current) return;
    setExportingPagarPdf(true);
    try {
      const pdf = await pdfWithTitle(pagarSectionRef, 'Por Pagar', localFiltersPagar);
      pdf.save('Por_Pagar.pdf');
    } catch (err) { console.error('Error generando PDF:', err); }
    finally { setExportingPagarPdf(false); }
  };

  const descargarPagarExcel = () => {
    if (porPagar.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center' } };
    const cellStyle = { alignment: { horizontal: 'left' } };
    const numStyle = { alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const filtered = porPagar.filter(item => item.empresa !== 'ECOTRANSPORTE');
    const rows = [
      [{ v: 'Cliente', s: headerStyle }, { v: 'Empresa', s: headerStyle }, { v: 'Divisa', s: headerStyle }, { v: 'Por Pagar', s: headerStyle }],
      ...filtered.map(item => [
        { v: item.cliente || 'Sin cliente', s: cellStyle },
        { v: item.empresa || 'SIN EMPRESA', s: cellStyle },
        { v: item.divisa || 'PEN', s: cellStyle },
        { v: Math.round((Number(item.total) || 0) * 100) / 100, t: 'n', s: numStyle },
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Por Pagar');
    XLSX.writeFile(wb, 'Por_Pagar.xlsx');
  };

  const descargarTnPDF = async () => {
    if (!tnSectionRef.current) return;
    setExportingTnPdf(true);
    try {
      const pdf = await pdfWithTitle(tnSectionRef, 'TN Cliente/Empresa', localFiltersTn);
      pdf.save('TN_Cliente_Empresa.pdf');
    } catch (err) { console.error('Error generando PDF:', err); }
    finally { setExportingTnPdf(false); }
  };

  const descargarTnExcel = () => {
    if (tnClienteEmpresa.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B7430' } }, alignment: { horizontal: 'center' } };
    const cellStyle = { alignment: { horizontal: 'left' } };
    const numStyle = { alignment: { horizontal: 'right' }, numFmt: '#,##0.00' };
    const rows = [
      [{ v: 'Cliente', s: headerStyle }, { v: 'Empresa', s: headerStyle }, { v: 'Peso Ticket (TN Recibida)', s: headerStyle }],
      ...tnClienteEmpresa.map(item => [
        { v: item.cliente || 'Sin cliente', s: cellStyle },
        { v: formatEmpresa(item.empresa), s: cellStyle },
        { v: Math.round((Number(item.total) || 0) * 100) / 100, t: 'n', s: numStyle },
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'TN Cliente Empresa');
    XLSX.writeFile(wb, 'TN_Cliente_Empresa.xlsx');
  };

  const formatEmpresa = (empresa) => {
    if (!empresa || empresa === 'SIN EMPRESA') return empresa || 'SIN EMPRESA';
    if (empresa === 'ECOTRANSPORTE') return 'ECOTRANSPORTE';
    return `ECOTRANSPORTE(${empresa})`;
  };

  // Agrupar datos para gráficos jerárquicos (Cliente → Empresa)
  const prepareChartData = (data) => {
    const grouped = {};
    data.forEach(item => {
      const key = `${item.cliente}|${item.empresa}`;
      if (!grouped[key]) {
        grouped[key] = {
          label: `${item.cliente} - ${formatEmpresa(item.empresa)}`,
          cliente: item.cliente,
          empresa: item.empresa,
          PEN: 0,
          USD: 0,
        };
      }
      const divisa = normalizeDivisa(item.divisa);
      grouped[key][divisa] = (grouped[key][divisa] || 0) + parseFloat(item.total || 0);
    });
    return Object.values(grouped);
  };

  // Para Pagar: usar nombre directo de empresa (sin prefijo ECOTRANSPORTE)
  const prepareChartDataPagar = (data) => {
    const grouped = {};
    data.forEach(item => {
      if (item.empresa === 'ECOTRANSPORTE') return;
      const key = `${item.cliente}|${item.empresa}`;
      if (!grouped[key]) {
        grouped[key] = {
          label: `${item.cliente} - ${item.empresa || 'SIN EMPRESA'}`,
          cliente: item.cliente,
          empresa: item.empresa,
          PEN: 0,
          USD: 0,
        };
      }
      const divisa = normalizeDivisa(item.divisa);
      grouped[key][divisa] = (grouped[key][divisa] || 0) + parseFloat(item.total || 0);
    });
    return Object.values(grouped);
  };

  // Preparar datos para TN por Cliente/Empresa
  const prepareTnData = (data) => data.map(item => ({
    label: `${item.cliente} - ${formatEmpresa(item.empresa)}`,
    cliente: item.cliente,
    empresa: item.empresa,
    total: parseFloat(item.total || 0),
  }));

  // Preparar datos de seguimiento (pivot por semana)
  const prepareSeguimientoData = (data) => {
    const semanas = [...new Set(data.map(d => d.semana))].sort();
    const grouped = {};
    
    data.forEach(item => {
      const key = `${item.cliente}|${item.empresa}|${item.placa}`;
      if (!grouped[key]) {
        grouped[key] = {
          cliente: item.cliente,
          empresa: item.empresa,
          placa: item.placa,
        };
        semanas.forEach(s => grouped[key][s] = 0);
      }
      grouped[key][item.semana] = parseFloat(item.tn_recibida || 0);
    });
    
    return { rows: Object.values(grouped), semanas };
  };

  if (loading) {
    return <div className="loading-section"><div className="spinner"></div></div>;
  }

  const cobrarChart = prepareChartData(porCobrar);
  const pagarChart = prepareChartDataPagar(porPagar);
  const margenChart = prepareChartData(margenOperativo);
  const tnChart = prepareTnData(tnClienteEmpresa);
  const seguimientoData = prepareSeguimientoData(seguimiento);

  const tabs = [
    { id: 'cobrar', label: 'Por Cobrar' },
    { id: 'pagar', label: 'Por Pagar' },
    { id: 'margen', label: 'Margen Operativo' },
    { id: 'tonelaje', label: 'TN Cliente/Empresa' },
    { id: 'seguimiento', label: 'Seguimiento' },
  ];

  const formatCurrency = (value, divisa = 'PEN') => {
    const normalizedDivisa = normalizeDivisa(divisa);
    const symbol = normalizedDivisa === 'USD' ? '$' : 'S/';
    return `${symbol} ${fmtNum(value)}`;
  };

  return (
    <div className="dashboard-financiero">
      {/* Sub-tabs */}
      <div className="sub-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sub-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Por Cobrar */}
      {activeTab === 'cobrar' && (
        <div className="financiero-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0}}>💵 Por Cobrar por Cliente / Empresa</h2>
            {porCobrar.length > 0 && (
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn-download-excel" onClick={descargarCobrarExcel}>📊 Excel</button>
                <button className="btn-download-pdf" onClick={descargarCobrarPDF} disabled={exportingCobrarPdf}>
                  {exportingCobrarPdf ? 'Generando...' : '📥 PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFilters.mes} onChange={e => handleFilterChange('mes', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFilters.semana} onChange={e => handleFilterChange('semana', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFilters.cliente} onChange={e => handleFilterChange('cliente', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFilters.transportista} onChange={e => handleFilterChange('transportista', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todos</option>
                  {filterOptions.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFilters.unidad} onChange={e => handleFilterChange('unidad', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFilters.divisa} onChange={e => handleFilterChange('divisa', e.target.value)} disabled={filtersLoading}>
                  <option value="">Todas</option>
                  {filterOptions.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFilters} disabled={filtersLoading}>
                {filtersLoading ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>
          
          <div ref={cobrarSectionRef}>
          {/* Tabla */}
          <div className="section-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
              <h3 style={{margin:0}}>Tabla Dinámica - Por Cobrar</h3>
              {porCobrar.length > 0 && <button className="btn-download-excel" onClick={descargarCobrarExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #1B7430',background:'#e8f5e9',color:'#1B7430',fontWeight:600,fontSize:'0.8rem',cursor:'pointer'}}>📊 Excel</button>}
            </div>
            {porCobrar.length === 0 ? (
              <p className="empty-message">No hay datos de facturación</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Por Cobrar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCobrar.map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{formatEmpresa(item.empresa)}</td>
                        <td>{item.divisa || 'PEN'}</td>
                        <td className="amount">{formatCurrency(item.total, item.divisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Gráfico */}
          <div className="chart-section">
            <h3>Gráfica - Por Cobrar</h3>
            <div className="chart-container">
              {cobrarChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, cobrarChart.length * (isMobile ? 60 : 70) + 40)}>
                  <BarChart data={cobrarChart} layout="vertical" barSize={14} margin={{ right: isMobile ? 50 : 110, left: isMobile ? 5 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={isMobile ? 80 : 180} tick={{ fontSize: isMobile ? 9 : 11 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (<div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>{d.label}</p>
                        {d.USD > 0 && <p style={{ margin: '4px 0 0', color: COLORS.USD, fontSize: 12 }}>Dólares (USD): $ {fmtNum(d.USD)}</p>}
                        {d.PEN > 0 && <p style={{ margin: '4px 0 0', color: COLORS.PEN, fontSize: 12 }}>Soles (PEN): S/ {fmtNum(d.PEN)}</p>}
                      </div>);
                    }} />
                    {!isMobile && <Legend />}
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD} shape={CobrarUsdBar} />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN} shape={CobrarPenBar} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Por Pagar */}
      {activeTab === 'pagar' && (
        <div className="financiero-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0}}>💸 Por Pagar por Cliente / Empresa</h2>
            {porPagar.length > 0 && (
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn-download-excel" onClick={descargarPagarExcel}>📊 Excel</button>
                <button className="btn-download-pdf" onClick={descargarPagarPDF} disabled={exportingPagarPdf}>
                  {exportingPagarPdf ? 'Generando...' : '📥 PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersPagar.mes} onChange={e => handleFilterChangePagar('mes', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersPagar.semana} onChange={e => handleFilterChangePagar('semana', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersPagar.cliente} onChange={e => handleFilterChangePagar('cliente', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersPagar.transportista} onChange={e => handleFilterChangePagar('transportista', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todos</option>
                  {filterOptionsPagar.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersPagar.unidad} onChange={e => handleFilterChangePagar('unidad', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersPagar.divisa} onChange={e => handleFilterChangePagar('divisa', e.target.value)} disabled={filtersLoadingPagar}>
                  <option value="">Todas</option>
                  {filterOptionsPagar.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersPagar} disabled={filtersLoadingPagar}>
                {filtersLoadingPagar ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div ref={pagarSectionRef}>
          <div className="section-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
              <h3 style={{margin:0}}>Tabla Dinámica - Por Pagar</h3>
              {porPagar.length > 0 && <button className="btn-download-excel" onClick={descargarPagarExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #1B7430',background:'#e8f5e9',color:'#1B7430',fontWeight:600,fontSize:'0.8rem',cursor:'pointer'}}>📊 Excel</button>}
            </div>
            {porPagar.length === 0 ? (
              <p className="empty-message">No hay datos de pagos pendientes</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Por Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porPagar.filter(item => item.empresa !== 'ECOTRANSPORTE').map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{item.empresa || 'SIN EMPRESA'}</td>
                        <td>{item.divisa || 'PEN'}</td>
                        <td className="amount negative">{formatCurrency(item.total, item.divisa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - Por Pagar</h3>
            <div className="chart-container">
              {pagarChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, pagarChart.length * (isMobile ? 60 : 70) + 40)}>
                  <BarChart data={pagarChart} layout="vertical" barSize={14} margin={{ right: isMobile ? 50 : 110, left: isMobile ? 5 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={isMobile ? 80 : 180} tick={{ fontSize: isMobile ? 9 : 11 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (<div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>{d.label}</p>
                        {d.USD > 0 && <p style={{ margin: '4px 0 0', color: COLORS.USD, fontSize: 12 }}>Dólares (USD): $ {fmtNum(d.USD)}</p>}
                        {d.PEN > 0 && <p style={{ margin: '4px 0 0', color: COLORS.PEN, fontSize: 12 }}>Soles (PEN): S/ {fmtNum(d.PEN)}</p>}
                      </div>);
                    }} />
                    {!isMobile && <Legend />}
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD} shape={CobrarUsdBar} />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN} shape={CobrarPenBar} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Margen Operativo */}
      {activeTab === 'margen' && (
        <div className="financiero-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0}}>📈 Margen Operativo por Cliente / Empresa</h2>
            {margenOperativo.length > 0 && (
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn-download-excel" onClick={descargarMargenExcel}>📊 Excel</button>
                <button className="btn-download-pdf" onClick={descargarMargenPDF} disabled={exportingMargenPdf}>
                  {exportingMargenPdf ? 'Generando...' : '📥 PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersMargen.mes} onChange={e => handleFilterChangeMargen('mes', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersMargen.semana} onChange={e => handleFilterChangeMargen('semana', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersMargen.cliente} onChange={e => handleFilterChangeMargen('cliente', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersMargen.transportista} onChange={e => handleFilterChangeMargen('transportista', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todos</option>
                  {filterOptionsMargen.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersMargen.unidad} onChange={e => handleFilterChangeMargen('unidad', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersMargen.divisa} onChange={e => handleFilterChangeMargen('divisa', e.target.value)} disabled={filtersLoadingMargen}>
                  <option value="">Todas</option>
                  {filterOptionsMargen.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersMargen} disabled={filtersLoadingMargen}>
                {filtersLoadingMargen ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div ref={margenSectionRef}>
          <div className="section-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
              <h3 style={{margin:0}}>Tabla Dinámica - Margen Operativo (Por Cobrar - Por Pagar)</h3>
              {margenOperativo.length > 0 && <button className="btn-download-excel" onClick={descargarMargenExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #1B7430',background:'#e8f5e9',color:'#1B7430',fontWeight:600,fontSize:'0.8rem',cursor:'pointer'}}>📊 Excel</button>}
            </div>
            {margenOperativo.length === 0 ? (
              <p className="empty-message">No hay datos de margen</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Divisa</th>
                      <th>Margen Operativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margenOperativo.map((item, index) => {
                      const margen = parseFloat(item.total || 0);
                      return (
                        <tr key={index}>
                          <td>{item.cliente || 'Sin cliente'}</td>
                          <td>{formatEmpresa(item.empresa)}</td>
                          <td>{item.divisa || 'PEN'}</td>
                          <td className={`amount ${margen >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(margen, item.divisa)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - Margen Operativo</h3>
            <div className="chart-container">
              {margenChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, margenChart.length * (isMobile ? 60 : 70) + 40)}>
                  <BarChart data={margenChart} layout="vertical" barSize={14} margin={{ right: isMobile ? 50 : 110, left: isMobile ? 5 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={isMobile ? 80 : 180} tick={{ fontSize: isMobile ? 9 : 11 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (<div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>{d.label}</p>
                        {d.USD !== 0 && <p style={{ margin: '4px 0 0', color: COLORS.USD, fontSize: 12 }}>Dólares (USD): $ {fmtNum(d.USD)}</p>}
                        {d.PEN !== 0 && <p style={{ margin: '4px 0 0', color: COLORS.PEN, fontSize: 12 }}>Soles (PEN): S/ {fmtNum(d.PEN)}</p>}
                      </div>);
                    }} />
                    {!isMobile && <Legend />}
                    <Bar dataKey="USD" name="Dólares (USD)" fill={COLORS.USD} shape={MargenUsdBar} />
                    <Bar dataKey="PEN" name="Soles (PEN)" fill={COLORS.PEN} shape={MargenPenBar} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TN por Cliente/Empresa */}
      {activeTab === 'tonelaje' && (
        <div className="financiero-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0}}>⚖️ Tonelaje Recibido por Cliente / Empresa</h2>
            {tnClienteEmpresa.length > 0 && (
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn-download-excel" onClick={descargarTnExcel}>📊 Excel</button>
                <button className="btn-download-pdf" onClick={descargarTnPDF} disabled={exportingTnPdf}>
                  {exportingTnPdf ? 'Generando...' : '📥 PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes</label>
                <select value={localFiltersTn.mes} onChange={e => handleFilterChangeTn('mes', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersTn.semana} onChange={e => handleFilterChangeTn('semana', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersTn.cliente} onChange={e => handleFilterChangeTn('cliente', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Transportista</label>
                <select value={localFiltersTn.transportista} onChange={e => handleFilterChangeTn('transportista', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todos</option>
                  {filterOptionsTn.transportistas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersTn.unidad} onChange={e => handleFilterChangeTn('unidad', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Divisa</label>
                <select value={localFiltersTn.divisa} onChange={e => handleFilterChangeTn('divisa', e.target.value)} disabled={filtersLoadingTn}>
                  <option value="">Todas</option>
                  {filterOptionsTn.divisas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersTn} disabled={filtersLoadingTn}>
                {filtersLoadingTn ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div className="section-card" ref={tnSectionRef}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
              <h3 style={{margin:0}}>Tabla Dinámica - Peso Ticket (TN Recibida)</h3>
              {tnClienteEmpresa.length > 0 && <button className="btn-download-excel" onClick={descargarTnExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #1B7430',background:'#e8f5e9',color:'#1B7430',fontWeight:600,fontSize:'0.8rem',cursor:'pointer'}}>📊 Excel</button>}
            </div>
            {tnClienteEmpresa.length === 0 ? (
              <p className="empty-message">No hay datos de tonelaje</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Peso Ticket (TN Recibida)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tnClienteEmpresa.map((item, index) => (
                      <tr key={index}>
                        <td>{item.cliente || 'Sin cliente'}</td>
                        <td>{formatEmpresa(item.empresa)}</td>
                        <td>{fmtNum(item.total)} TN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="chart-section">
            <h3>Gráfica - Peso Ticket por Cliente / Empresa</h3>
            <div className="chart-container">
              {tnChart.length === 0 ? (
                <p className="empty-message">No hay datos para graficar</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, tnChart.length * (isMobile ? 60 : 70) + 40)}>
                  <BarChart data={tnChart} layout="vertical" barSize={30} margin={{ right: isMobile ? 50 : 90, left: isMobile ? 5 : 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={isMobile ? 80 : 200} tick={{ fontSize: isMobile ? 9 : 11 }} />
                    <Tooltip formatter={(value) => [`${fmtNum(value)} TN`, 'Tonelaje']} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }} />
                    {!isMobile && <Legend />}
                    <Bar dataKey="total" name="Peso Ticket" fill={COLORS.PEN} radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="total" position="right" formatter={(v) => v > 0 ? `${fmtNum(v)} TN` : ''} style={{ fontSize: isMobile ? 9 : 11, fill: '#1B7430' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seguimiento de Transporte */}
      {activeTab === 'seguimiento' && (
        <div className="financiero-section">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2 style={{margin:0}}>🚧 Seguimiento de Transporte - Peso Ticket Recibido por Semana</h2>
            {seguimiento.length > 0 && localFiltersSeg.mes && (
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn-download-excel" onClick={descargarSegExcel}>📊 Excel</button>
                <button className="btn-download-pdf" onClick={descargarSegPDF} disabled={exportingSegPdf}>
                  {exportingSegPdf ? 'Generando...' : '📥 PDF'}
                </button>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="section-filters">
            <div className="filter-row">
              <div className="filter-item">
                <label>Mes <span className="required-badge">requerido</span></label>
                <select value={localFiltersSeg.mes} onChange={e => handleFilterChangeSeg('mes', e.target.value)} disabled={filtersLoadingSeg}>
                  <option value="">-- Selecciona un mes --</option>
                  {filterOptionsSeg.meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Semana</label>
                <select value={localFiltersSeg.semana} onChange={e => handleFilterChangeSeg('semana', e.target.value)} disabled={filtersLoadingSeg || !localFiltersSeg.mes}>
                  <option value="">Todas</option>
                  {filterOptionsSeg.semanas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Cliente</label>
                <select value={localFiltersSeg.cliente} onChange={e => handleFilterChangeSeg('cliente', e.target.value)} disabled={filtersLoadingSeg || !localFiltersSeg.mes}>
                  <option value="">Todos</option>
                  {filterOptionsSeg.clientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Unidad</label>
                <select value={localFiltersSeg.unidad} onChange={e => handleFilterChangeSeg('unidad', e.target.value)} disabled={filtersLoadingSeg || !localFiltersSeg.mes}>
                  <option value="">Todas</option>
                  {filterOptionsSeg.unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button className="btn-clear-local" onClick={clearFiltersSeg} disabled={filtersLoadingSeg}>
                {filtersLoadingSeg ? '...' : 'Limpiar'}
              </button>
            </div>
          </div>

          <div className="section-card full-width" ref={segSectionRef}>
            <h3>Tabla de Seguimiento - Tonelaje <span style={{color:'#1B7430'}}>Recibido</span> (Cliente → Empresa → Unidad → Semana)</h3>
            {!localFiltersSeg.mes ? (
              <p className="empty-message">📅 Selecciona un <strong>mes</strong> para generar la tabla de seguimiento.</p>
            ) : seguimiento.length === 0 ? (
              <p className="empty-message">No hay datos de seguimiento para los filtros seleccionados</p>
            ) : (
              <div className="table-container seguimiento-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Empresa</th>
                      <th>Placa</th>
                      {seguimientoData.semanas.map(semana => (
                        <th key={semana}>Sem. {semana} <span style={{fontWeight:400,fontSize:'0.75rem'}}>(TN Rec.)</span></th>
                      ))}
                      <th>Total (TN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seguimientoData.rows.map((row, index) => {
                      const total = seguimientoData.semanas.reduce((sum, s) => sum + (row[s] || 0), 0);
                      return (
                        <tr key={index}>
                          <td>{row.cliente || 'Sin cliente'}</td>
                          <td>{formatEmpresa(row.empresa)}</td>
                          <td>{row.placa}</td>
                          {seguimientoData.semanas.map(semana => (
                            <td key={semana} className="number" style={{whiteSpace:'nowrap'}}>
                              {row[semana] ? `${fmtNum(row[semana])} TN` : '-'}
                            </td>
                          ))}
                          <td className="total" style={{whiteSpace:'nowrap'}}>{fmtNum(total)} TN</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFinanciero;
