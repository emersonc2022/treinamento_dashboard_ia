//cole o código do gemini aqui

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Upload, DollarSign, ShoppingCart, TrendingUp, Calendar, FileSpreadsheet, MapPin, Lock, User, LogOut } from 'lucide-react';

// Amostra de dados inicial baseada na estrutura do arquivo enviado para preview imediato.
const MOCK_CSV_DATA = `data;regiao;filtro_cfop;quantidade;receita_bruta
2026-01-02;Outro;DEVOLUCAO;-18;-404.58
2026-01-02;Sudeste;VENDA;3;346.13
2026-01-05;Sudeste;VENDA;12;1500.00
2026-01-15;Sul;VENDA;5;600.50
2026-02-01;Sudeste;VENDA;10;1200.00
2026-02-05;Nordeste;VENDA;8;950.00
2026-02-10;Outro;DEVOLUCAO;-5;-200.00
2026-02-15;Sul;VENDA;15;2100.00
2026-02-20;Sudeste;VENDA;20;3200.50
2026-02-24;Sudeste;VENDA;18;1367.75
2026-02-25;Sudeste;VENDA;540;6960.98
2026-03-01;Sudeste;VENDA;12;1850.00
2026-03-02;Sul;VENDA;8;920.00
2026-03-03;Nordeste;VENDA;15;2400.00
2026-03-04;Outro;DEVOLUCAO;-2;-150.00
2026-03-05;Sudeste;VENDA;30;4500.00`;

export default function App() {
  // Estados de Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [rawData, setRawData] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableRegions, setAvailableRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [fileName, setFileName] = useState('Amostra de Dados');
  const fileInputRef = useRef(null);

  // Função para processar o CSV (trata separador ';' e decimais)
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(';').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(';');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : '';
      });
      
      // Conversão de tipos
      const receitaStr = row.receita_bruta || '0';
      row.receita_bruta = parseFloat(receitaStr.replace(',', '.')) || 0;
      row.quantidade = parseInt(row.quantidade, 10) || 0;
      data.push(row);
    }
    return data;
  };

  // Carrega os dados iniciais
  useEffect(() => {
    const parsedData = parseCSV(MOCK_CSV_DATA);
    loadProcessedData(parsedData);
  }, []);

  // Lida com o processamento após parsing e define o mês mais recente
  const loadProcessedData = (data) => {
    setRawData(data);
    
    // Extrai meses únicos no formato YYYY-MM
    const months = [...new Set(data.map(item => {
      if (!item.data) return null;
      return item.data.substring(0, 7); // Pega apenas YYYY-MM
    }))].filter(Boolean);
    
    // Ordena decrescente (mais recente primeiro)
    months.sort((a, b) => b.localeCompare(a));
    
    setAvailableMonths(months);
    if (months.length > 0) {
      setSelectedMonth(months[0]); // Define o mês mais recente inicialmente
    }

    // Extrai regiões únicas
    const regions = [...new Set(data.map(item => item.regiao))].filter(Boolean);
    regions.sort((a, b) => a.localeCompare(b));
    setAvailableRegions(['Todas', ...regions]);
    setSelectedRegion('Todas');
  };

  // Lida com upload de novo arquivo
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsedData = parseCSV(text);
        loadProcessedData(parsedData);
      };
      reader.readAsText(file);
    }
  };

  // Formata valores para R$
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formata o mês para exibição (ex: 2026-03 -> Março/2026)
  const formatMonthName = (yearMonthStr) => {
    if (!yearMonthStr) return '';
    const [year, month] = yearMonthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  };

  // Obtém a string do mês anterior (YYYY-MM)
  const getPreviousMonth = (currentMonthStr) => {
    if (!currentMonthStr) return null;
    const [year, month] = currentMonthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  };

  // Processamento reativo dos KPIs e Gráficos baseado no mês selecionado
  const { kpis, chartData, comparisonData } = useMemo(() => {
    if (!rawData.length || !selectedMonth) return { kpis: { total: 0, orders: 0, ticket: 0 }, chartData: [], comparisonData: [] };

    // 1. Filtrar pelo mês e região
    const filtered = rawData.filter(item => {
      const isMonthMatch = item.data && item.data.startsWith(selectedMonth);
      const isRegionMatch = selectedRegion === 'Todas' || item.regiao === selectedRegion;
      return isMonthMatch && isRegionMatch;
    });

    // 2. Calcular KPIs
    // Total de vendas (soma das receitas, devoluções já entram negativas na soma se baseadas no original)
    const totalVendas = filtered.reduce((acc, curr) => acc + curr.receita_bruta, 0);
    
    // Número de pedidos (contando apenas operações de VENDA)
    const numPedidos = filtered.filter(item => item.filtro_cfop?.toUpperCase() === 'VENDA').length;
    
    // Ticket Médio
    const ticketMedio = numPedidos > 0 ? (totalVendas / numPedidos) : 0;

    // 3. Agrupar dados por dia para o gráfico
    const dailyDataMap = {};
    filtered.forEach(item => {
      const dateKey = item.data; // Formato YYYY-MM-DD
      if (!dailyDataMap[dateKey]) {
        dailyDataMap[dateKey] = 0;
      }
      dailyDataMap[dateKey] += item.receita_bruta;
    });

    // Converter mapa para array ordenado
    const chartArray = Object.keys(dailyDataMap)
      .sort() // Ordena cronologicamente
      .map(date => {
        const [, , day] = date.split('-');
        return {
          dateLabel: `${day}/${date.split('-')[1]}`, // Formato DD/MM
          fullDate: date,
          receita: Number(dailyDataMap[date].toFixed(2))
        };
      });

    // 4. Calcular dados para o gráfico de comparação com o mês anterior
    const prevMonthStr = getPreviousMonth(selectedMonth);
    const prevMonthData = rawData.filter(item => {
      const isMonthMatch = item.data && item.data.startsWith(prevMonthStr);
      const isRegionMatch = selectedRegion === 'Todas' || item.regiao === selectedRegion;
      return isMonthMatch && isRegionMatch;
    });
    const prevTotalVendas = prevMonthData.reduce((acc, curr) => acc + curr.receita_bruta, 0);

    const comparisonArray = [
      {
        name: formatMonthName(prevMonthStr) || 'Anterior',
        receita: prevTotalVendas,
        fill: '#D97706' // Dourado
      },
      {
        name: formatMonthName(selectedMonth),
        receita: totalVendas,
        fill: '#881337' // Vinho (Grand Cru)
      }
    ];

    return {
      kpis: {
        total: totalVendas,
        orders: numPedidos,
        ticket: ticketMedio
      },
      chartData: chartArray,
      comparisonData: comparisonArray
    };
  }, [rawData, selectedMonth, selectedRegion]);

  // Função de Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUser === 'treinamento_ia' && loginPass === 'treinamento_123') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // Função de Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUser('');
    setLoginPass('');
  };

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-rose-800" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-slate-500 mt-2">Painel Executivo de Vendas</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  value={loginUser} 
                  onChange={(e) => setLoginUser(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-800 focus:border-rose-800 outline-none transition-all" 
                  placeholder="Digite seu usuário" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input 
                  type="password" 
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-800 focus:border-rose-800 outline-none transition-all" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {loginError && (
              <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
                Usuário ou senha incorretos.
              </p>
            )}

            <button 
              type="submit" 
              className="w-full bg-rose-800 hover:bg-rose-900 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-rose-800/30 active:scale-[0.98] mt-2"
            >
              Entrar no Dashboard
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">Ambiente seguro e monitorado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-rose-800" size={28} />
              Dashboard de Vendas
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <FileSpreadsheet size={14} /> Fonte de Dados: <span className="font-medium text-rose-800">{fileName}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Seletor de Região */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={16} className="text-slate-400" />
              </div>
              <select 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-800 focus:border-rose-800 outline-none w-full appearance-none cursor-pointer"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                {availableRegions.map(region => (
                  <option key={region} value={region}>
                    {region === 'Todas' ? 'Todas as Regiões' : region}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Mês */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-slate-400" />
              </div>
              <select 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-800 focus:border-rose-800 outline-none w-full appearance-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {formatMonthName(month)}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload de Arquivo */}
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors w-full sm:w-auto shadow-sm shadow-rose-200">
              <Upload size={16} />
              <span>Importar Base (CSV)</span>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
              />
            </label>

            {/* Botão de Sair */}
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl cursor-pointer transition-colors w-full sm:w-auto"
              title="Sair do sistema"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Total de Vendas */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <DollarSign size={80} className="text-rose-800" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-rose-900 uppercase tracking-wider mb-1">
                Total de Vendas
              </p>
              <h2 className="text-3xl font-bold text-slate-800">
                {formatCurrency(kpis.total)}
              </h2>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-800 w-full"></div>
            </div>
          </div>

          {/* Card: Número de Pedidos */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <ShoppingCart size={80} className="text-amber-600" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-1">
                Número de Pedidos
              </p>
              <h2 className="text-3xl font-bold text-slate-800">
                {kpis.orders}
              </h2>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 w-full"></div>
            </div>
          </div>

          {/* Card: Ticket Médio */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
              <TrendingUp size={80} className="text-rose-800" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Ticket Médio
              </p>
              <h2 className="text-3xl font-bold text-slate-800">
                {formatCurrency(kpis.ticket)}
              </h2>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-600 to-rose-800 w-full"></div>
            </div>
          </div>
        </div>

        {/* Seção de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico Principal (Ocupa 2 colunas em telas grandes) */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Evolução Diária de Receita</h3>
              <p className="text-sm text-slate-500">Acompanhamento financeiro para o período de {formatMonthName(selectedMonth)}</p>
            </div>
            
            {chartData.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#881337" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#881337" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="dateLabel" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `R$ ${value / 1000}k`}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [formatCurrency(value), 'Receita Bruta']}
                      labelFormatter={(label, payload) => payload.length ? `Data: ${payload[0].payload.fullDate}` : label}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#881337" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorReceita)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#D97706' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">Não há dados diários para este período.</p>
              </div>
            )}
          </div>

          {/* Gráfico de Comparação Mensal */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Comparação Mensal</h3>
              <p className="text-sm text-slate-500">Receita vs. Mês Anterior</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(value), 'Receita Total']}
                  />
                  <Bar dataKey="receita" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {
                      comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
