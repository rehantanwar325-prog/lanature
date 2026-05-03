'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Navbar from '@/components/Navbar';
import { generateToken } from '@/lib/session';

export default function QRGeneratorPage() {
  const [qrType, setQrType] = useState('table');
  const [qrNumber, setQrNumber] = useState('1');
  const [showResult, setShowResult] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrTimestamp, setQrTimestamp] = useState('');
  const [bulkType, setBulkType] = useState('table');
  const [bulkCount, setBulkCount] = useState('10');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkTokens, setBulkTokens] = useState<string[]>([]);
  const qrRef = useRef<HTMLDivElement>(null);

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    const loc = window.location;
    return loc.protocol + '//' + loc.host;
  };

  // ─── Single QR with token ───
  const generateQR = () => {
    const token = generateToken();
    const ts = Date.now().toString();
    setQrToken(token);
    setQrTimestamp(ts);
    setShowResult(true);
  };

  const getQRUrl = (type: string, num: string, token: string, ts: string) => {
    return `${getBaseUrl()}/order?type=${type}&id=${num}&token=${token}&t=${ts}`;
  };

  const qrUrl = showResult ? getQRUrl(qrType, qrNumber, qrToken, qrTimestamp) : '';
  const label = (qrType === 'table' ? 'Table ' : 'Room ') + qrNumber;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `LaNature_QR_${qrType}_${qrNumber}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const printQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const imgData = canvas.toDataURL();
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>QR - ${label}</title>
      <style>body{font-family:'Segoe UI',sans-serif;text-align:center;padding:40px;}h1{font-size:2rem;margin-bottom:4px;}h2{color:#666;font-size:1rem;margin-bottom:20px;}img{margin:0 auto;}p{color:#999;font-size:0.8rem;margin-top:16px;}.badge{display:inline-block;background:#2D5016;color:white;padding:4px 12px;border-radius:20px;font-size:0.75rem;margin-top:8px;}</style></head>
      <body><h1>LaNature Hotel</h1><h2>${label}</h2><img src="${imgData}" width="250"><p>Scan to view menu & order food</p><div class="badge">🔒 GPS Secured</div><script>setTimeout(()=>window.print(),300)<\/script></body></html>
    `);
  };

  // ─── Bulk generate with unique tokens per QR ───
  const bulkGenerate = () => {
    const count = Math.min(parseInt(bulkCount) || 5, 20);
    const tokens: string[] = [];
    for (let i = 0; i < count; i++) {
      tokens.push(generateToken());
    }
    setBulkTokens(tokens);
    setShowBulk(true);
  };

  const printBulk = () => {
    const count = Math.min(parseInt(bulkCount) || 5, 20);
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    let items = '';
    for (let i = 1; i <= count; i++) {
      const canvas = document.querySelector(`#bulk-qr-${i} canvas`) as HTMLCanvasElement;
      const imgData = canvas ? canvas.toDataURL() : '';
      const lbl = (bulkType === 'table' ? 'Table ' : 'Room ') + i;
      items += `<div style="text-align:center;padding:20px;break-inside:avoid;"><h3>${lbl}</h3><img src="${imgData}" width="160"><p style="color:#999;font-size:0.7rem;margin-top:8px;">Scan to order • 🔒 GPS Secured</p></div>`;
    }
    printWin.document.write(`
      <html><head><title>LaNature QR Codes</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:20px;}h1{text-align:center;margin-bottom:20px;}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}</style></head>
      <body><h1>LaNature Hotel — QR Codes (GPS Secured)</h1><div class="grid">${items}</div><script>setTimeout(()=>window.print(),500)<\/script></body></html>
    `);
  };

  const bulkCountNum = Math.min(parseInt(bulkCount) || 5, 20);
  const bulkTimestamp = Date.now().toString();

  return (
    <>
      <Navbar forceScrolled />

      <div className="min-h-screen pt-24 pb-16 bg-bg">
        <div className="max-w-[600px] mx-auto px-4">

          {/* Single QR */}
          <div className="bg-white rounded-[20px] shadow-lg p-10 text-center">
            <div className="w-[50px] h-[50px] bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center mx-auto mb-4 text-lg text-white font-bold font-heading">
              L
            </div>
            <h2 className="font-heading text-2xl mb-2">QR Code Generator</h2>
            <p className="text-text-light mb-2">Generate GPS-secured QR codes for tables & rooms</p>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-5">
              🔒 Each QR has a unique secure token
            </div>

            <div className="text-left space-y-4">
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Location Type</label>
                <select
                  value={qrType}
                  onChange={e => { setQrType(e.target.value); setShowResult(false); }}
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent bg-white"
                >
                  <option value="table">🍽 Table</option>
                  <option value="room">🛏 Room</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Number</label>
                <input
                  type="number"
                  value={qrNumber}
                  onChange={e => { setQrNumber(e.target.value); setShowResult(false); }}
                  placeholder="e.g. 5"
                  min="1"
                  max="500"
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent"
                />
              </div>

              {/* Info badges */}
              <div className="bg-bg-warm rounded-[10px] p-4 text-xs text-text-light space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📏</span>
                  <span>Max distance: <strong className="text-dark">{qrType === 'table' ? '50m' : '200m'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">⏱</span>
                  <span>Session: <strong className="text-dark">{qrType === 'table' ? '1 hour' : '24 hours'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">📍</span>
                  <span>GPS verification required for every order</span>
                </div>
              </div>

              <button
                onClick={generateQR}
                className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white hover:translate-y-[-2px] transition-all duration-300"
              >
                🔐 Generate Secure QR Code
              </button>
            </div>

            {/* QR Result */}
            {showResult && (
              <div className="mt-8 p-8 border-2 border-dashed border-[#e0ddd5] rounded-[12px]" ref={qrRef}>
                <h3 className="font-heading text-lg mb-1">{label}</h3>
                <div className="flex justify-center mb-4">
                  <QRCodeCanvas
                    value={qrUrl}
                    size={200}
                    fgColor="#1A1A1A"
                    bgColor="#FFFFFF"
                    level="H"
                  />
                </div>
                <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  🔒 GPS Secured • Unique Token
                </div>
                <p className="text-xs text-text-light break-all mb-4">{qrUrl}</p>
                <div className="flex gap-3">
                  <button
                    onClick={printQR}
                    className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark"
                  >
                    🖨 Print QR
                  </button>
                  <button
                    onClick={downloadQR}
                    className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    ⬇ Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Generator */}
          <div className="bg-white rounded-[20px] shadow-lg p-10 text-center mt-6">
            <h2 className="font-heading text-2xl mb-2">Bulk Generate</h2>
            <p className="text-text-light mb-6">Generate secured QR codes for multiple tables or rooms at once</p>

            <div className="text-left space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 font-semibold text-sm">Type</label>
                  <select
                    value={bulkType}
                    onChange={e => { setBulkType(e.target.value); setShowBulk(false); }}
                    className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent bg-white"
                  >
                    <option value="table">Tables</option>
                    <option value="room">Rooms</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold text-sm">Count (1–20)</label>
                  <input
                    type="number"
                    value={bulkCount}
                    onChange={e => { setBulkCount(e.target.value); setShowBulk(false); }}
                    min="1"
                    max="20"
                    className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
              <button
                onClick={bulkGenerate}
                className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white hover:translate-y-[-2px] transition-all duration-300"
              >
                🔐 Generate All
              </button>
            </div>

            {showBulk && (
              <div className="mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Array.from({ length: bulkCountNum }, (_, i) => i + 1).map(num => {
                    const token = bulkTokens[num - 1] || generateToken();
                    const url = getQRUrl(bulkType, num.toString(), token, bulkTimestamp);
                    const lbl = (bulkType === 'table' ? 'Table ' : 'Room ') + num;
                    return (
                      <div key={num} className="text-center p-4 bg-bg-warm rounded-[12px]" id={`bulk-qr-${num}`}>
                        <p className="font-bold text-sm mb-2">{lbl}</p>
                        <div className="flex justify-center">
                          <QRCodeCanvas value={url} size={120} fgColor="#1A1A1A" bgColor="#FFFFFF" level="M" />
                        </div>
                        <div className="text-[0.6rem] text-green-600 mt-1">🔒 Secured</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={printBulk}
                  className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark mt-4"
                >
                  🖨 Print All QR Codes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
