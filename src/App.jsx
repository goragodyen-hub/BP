import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Clock, Calendar, CheckCircle, AlertCircle, Save, History, RefreshCw, Info, PieChart, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// === การตั้งค่า Google Apps Script URL ===
// หลังจาก Deploy Apps Script แล้ว ให้นำ URL มาใส่ที่นี่
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4o0tmw0Q8hwkxghoUgATNKM0iJ-2bfv-AtkHi4X7nxJxSHJEP625aL2qDfT-sUAn0/exec';

function App() {
  const [activeTab, setActiveTab] = useState('record'); // 'record', 'history', 'report'
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [historyData, setHistoryData] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    session: 'เช้า', // 'เช้า' หรือ 'ก่อนนอน'
    m1_sys: '', m1_dia: '', m1_pulse: '',
    m2_sys: '', m2_dia: '', m2_pulse: '',
    remarks: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!SCRIPT_URL.includes('AKfyc')) {
      setStatus({ type: 'error', message: 'กรุณาใส่ URL ของ Google Apps Script ในไฟล์ App.jsx' });
      return;
    }
    
    setLoading(true);
    setStatus(null);

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      setStatus({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว!' });
      setFormData(prev => ({
        ...prev,
        m1_sys: '', m1_dia: '', m1_pulse: '',
        m2_sys: '', m2_dia: '', m2_pulse: '',
        remarks: ''
      }));
      // อัปเดตข้อมูลประวัติหลังจากบันทึก
      fetchHistory();
      
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!SCRIPT_URL.includes('AKfyc')) return;
    setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      if (data.status === 'success') {
        setHistoryData(data.data);
      }
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'report') {
      // โหลดครั้งเดียวพอ ถ้ามีแล้วข้าม หรือถ้ากดปุ่ม refresh ค่อยโหลดใหม่
      if (historyData.length === 0) {
         fetchHistory();
      }
    }
  }, [activeTab]);

  // ฟังก์ชันประเมินระดับความดัน
  const getBPStatus = (sys, dia) => {
    if (!sys || !dia) return null;
    const s = parseInt(sys);
    const d = parseInt(dia);
    if (s >= 140 || d >= 90) return { label: 'สูงมาก', className: 'status-danger' };
    if (s >= 130 || d >= 80) return { label: 'เริ่มสูง', className: 'status-warning' };
    if (s < 90 || d < 60) return { label: 'ต่ำ', className: 'status-warning' };
    return { label: 'ปกติ', className: 'status-normal' };
  };

  // เตรียมข้อมูลสำหรับ Report
  const reportData = useMemo(() => {
    if (!historyData.length) return { chartData: [], avgSys: 0, avgDia: 0 };
    
    // เรียงข้อมูลจากเก่าไปใหม่สำหรับกราฟ
    const sortedData = [...historyData].reverse();
    
    let totalSys = 0, totalDia = 0, count = 0;

    const chartData = sortedData.map(row => {
      const dateObj = new Date(row['Timestamp']);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}) : row['วันที่ (Date)'];
      
      const s1 = parseInt(row['ครั้งที่ 1 ตัวบน (M1 Systolic)']) || 0;
      const d1 = parseInt(row['ครั้งที่ 1 ตัวล่าง (M1 Diastolic)']) || 0;
      const s2 = parseInt(row['ครั้งที่ 2 ตัวบน (M2 Systolic)']) || 0;
      const d2 = parseInt(row['ครั้งที่ 2 ตัวล่าง (M2 Diastolic)']) || 0;
      
      const avgSysDay = (s1 && s2) ? (s1 + s2)/2 : (s1 || s2);
      const avgDiaDay = (d1 && d2) ? (d1 + d2)/2 : (d1 || d2);

      if (avgSysDay > 0) { totalSys += avgSysDay; totalDia += avgDiaDay; count++; }

      return {
        name: `${dateStr} ${row['ช่วงเวลา (Session)']}`,
        SYS: Math.round(avgSysDay),
        DIA: Math.round(avgDiaDay)
      };
    }).filter(d => d.SYS > 0);

    return {
      chartData,
      avgSys: count ? Math.round(totalSys / count) : 0,
      avgDia: count ? Math.round(totalDia / count) : 0
    };
  }, [historyData]);

  return (
    <div className="app-container">
      <div className="glass-panel">
        <h1>บันทึกความดันที่บ้าน</h1>
        <p className="subtitle">ดูแลสุขภาพของคุณในทุกๆ วัน</p>

        <div className="tabs">
          <div className={`tab ${activeTab === 'record' ? 'active' : ''}`} onClick={() => setActiveTab('record')}>
            <Activity size={18} style={{ display: 'inline', marginBottom: '-3px', marginRight: '5px' }} />
            บันทึกค่า
          </div>
          <div className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={18} style={{ display: 'inline', marginBottom: '-3px', marginRight: '5px' }} />
            ประวัติ
          </div>
          <div className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
            <PieChart size={18} style={{ display: 'inline', marginBottom: '-3px', marginRight: '5px' }} />
            รายงาน
          </div>
        </div>

        {status && (
          <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}

        {activeTab === 'record' ? (
          <form onSubmit={handleSubmit}>
            <div className="flex-row">
              <div className="form-group flex-1">
                <label><Calendar size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> วันที่</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
              <div className="form-group flex-1">
                <label><Clock size={14} style={{ display: 'inline', marginBottom: '-2px' }}/> ช่วงเวลา</label>
                <select name="session" value={formData.session} onChange={handleChange}>
                  <option value="เช้า">เช้า (หลังตื่นนอน)</option>
                  <option value="ก่อนนอน">ก่อนนอน</option>
                </select>
              </div>
            </div>

            <div className="measurement-card">
              <div className="measurement-header">
                <Activity size={16} /> ครั้งที่ 1
              </div>
              <div className="input-grid">
                <div className="form-group">
                  <label>ตัวบน (SYS)</label>
                  <input type="number" name="m1_sys" placeholder="mmHg" value={formData.m1_sys} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ตัวล่าง (DIA)</label>
                  <input type="number" name="m1_dia" placeholder="mmHg" value={formData.m1_dia} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ชีพจร (Pulse)</label>
                  <input type="number" name="m1_pulse" placeholder="bpm" value={formData.m1_pulse} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className="measurement-card">
              <div className="measurement-header">
                <Activity size={16} /> ครั้งที่ 2 <span style={{fontSize:'0.8em', color:'var(--text-muted)', fontWeight:'normal'}}>(พัก 1 นาที)</span>
              </div>
              <div className="input-grid">
                <div className="form-group">
                  <label>ตัวบน (SYS)</label>
                  <input type="number" name="m2_sys" placeholder="mmHg" value={formData.m2_sys} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ตัวล่าง (DIA)</label>
                  <input type="number" name="m2_dia" placeholder="mmHg" value={formData.m2_dia} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>ชีพจร (Pulse)</label>
                  <input type="number" name="m2_pulse" placeholder="bpm" value={formData.m2_pulse} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุ / กิจกรรมขณะวัด</label>
              <input type="text" name="remarks" placeholder="เช่น เพิ่งดื่มกาแฟ, รู้สึกปวดหัว" value={formData.remarks} onChange={handleChange} />
            </div>

            <div style={{ background: 'rgba(2, 132, 199, 0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                <Info size={16} /> เกณฑ์ความดันโลหิตมาตรฐาน
              </h4>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-main)', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                <li><span className="status-normal status-badge" style={{display:'inline-block', width:'60px', textAlign:'center'}}>ปกติ</span> ตัวบน &lt; 130 <b>และ</b> ตัวล่าง &lt; 80</li>
                <li><span className="status-warning status-badge" style={{display:'inline-block', width:'60px', textAlign:'center'}}>เริ่มสูง</span> ตัวบน 130-139 <b>หรือ</b> ตัวล่าง 80-89</li>
                <li><span className="status-danger status-badge" style={{display:'inline-block', width:'60px', textAlign:'center'}}>สูงมาก</span> ตัวบน &ge; 140 <b>หรือ</b> ตัวล่าง &ge; 90</li>
              </ul>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>* อ้างอิงตามเกณฑ์มาตรฐานทั่วไป แนะนำให้ปรึกษาแพทย์สำหรับเป้าหมายส่วนบุคคล</p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="loader"></div> : <><Save size={20} /> บันทึกข้อมูล</>}
            </button>
          </form>

        ) : activeTab === 'history' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem' }}>ประวัติการวัดความดัน</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => window.print()} disabled={loading || historyData.length === 0}>
                  <Printer size={14} style={{ display: 'inline', marginBottom: '-2px', marginRight: '4px' }} /> พิมพ์ PDF
                </button>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={fetchHistory} disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'spinning' : ''} /> โหลดใหม่
                </button>
              </div>
            </div>
            
            <div className="table-container">
              {loading && historyData.length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>
              ) : historyData.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>วันที่/เวลา</th>
                      <th>ครั้งที่ 1 (SYS/DIA)</th>
                      <th>ครั้งที่ 2 (SYS/DIA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((row, idx) => {
                      const dateObj = new Date(row['Timestamp']);
                      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}) : row['วันที่ (Date)'];
                      const session = row['ช่วงเวลา (Session)'];
                      
                      const s1 = row['ครั้งที่ 1 ตัวบน (M1 Systolic)'];
                      const d1 = row['ครั้งที่ 1 ตัวล่าง (M1 Diastolic)'];
                      const p1 = row['ครั้งที่ 1 ชีพจร (M1 Pulse)'];
                      const stat1 = getBPStatus(s1, d1);

                      const s2 = row['ครั้งที่ 2 ตัวบน (M2 Systolic)'];
                      const d2 = row['ครั้งที่ 2 ตัวล่าง (M2 Diastolic)'];
                      const p2 = row['ครั้งที่ 2 ชีพจร (M2 Pulse)'];
                      const stat2 = getBPStatus(s2, d2);

                      return (
                        <tr key={idx}>
                          <td>{dateStr}<br/><span style={{color:'var(--text-muted)', fontSize:'0.75rem'}}>{session}</span></td>
                          <td>
                            <div style={{fontWeight: '600'}}>{s1}/{d1} <span style={{fontWeight:'normal', fontSize:'0.8em', color:'var(--text-muted)'}}>(♥{p1})</span></div>
                            {stat1 && <span className={`status-badge ${stat1.className}`} style={{marginTop:'0.2rem', display:'inline-block'}}>{stat1.label}</span>}
                          </td>
                          <td>
                            <div style={{fontWeight: '600'}}>{s2}/{d2} <span style={{fontWeight:'normal', fontSize:'0.8em', color:'var(--text-muted)'}}>(♥{p2})</span></div>
                            {stat2 && <span className={`status-badge ${stat2.className}`} style={{marginTop:'0.2rem', display:'inline-block'}}>{stat2.label}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>ไม่มีข้อมูล หรือยังไม่ได้ตั้งค่า Google Apps Script</div>
              )}
            </div>
            <style>{`.spinning { animation: spin 1s linear infinite; }`}</style>
          </div>
        ) : (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem' }}>สรุปรายงานความดันโลหิต</h2>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={fetchHistory} disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                </button>
             </div>
             
             {historyData.length === 0 ? (
               <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                 {loading ? "กำลังโหลดข้อมูล..." : "ยังไม่มีข้อมูลสำหรับสร้างรายงาน"}
               </div>
             ) : (
               <>
                 {/* สรุปตัวเลข */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>ค่าเฉลี่ยตัวบน (SYS)</p>
                      <h3 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', margin: 0 }}>{reportData.avgSys}</h3>
                    </div>
                    <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>ค่าเฉลี่ยตัวล่าง (DIA)</p>
                      <h3 style={{ fontSize: '2.5rem', color: 'var(--secondary-color)', margin: 0 }}>{reportData.avgDia}</h3>
                    </div>
                 </div>

                 {/* กราฟ */}
                 <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.5rem 1rem' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1rem' }}>📈 กราฟแนวโน้มความดันโลหิต</h4>
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <LineChart data={reportData.chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="name" tick={{fontSize: 10}} stroke="var(--text-muted)" />
                          <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} stroke="var(--text-muted)" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '5px' }}
                          />
                          <Legend wrapperStyle={{fontSize: '12px', marginTop: '10px'}} />
                          <Line type="monotone" name="ตัวบน (SYS)" dataKey="SYS" stroke="var(--primary-color)" strokeWidth={3} dot={{r: 4, fill: 'var(--primary-color)'}} activeDot={{r: 6}} />
                          <Line type="monotone" name="ตัวล่าง (DIA)" dataKey="DIA" stroke="var(--secondary-color)" strokeWidth={3} dot={{r: 4, fill: 'var(--secondary-color)'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
