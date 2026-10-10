import React, { useState } from 'react';
import { Wheat, MapPin, Check, Copy, Terminal, User, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { FarmerProfile } from '../../types/weather';

interface FarmerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: FarmerProfile) => void;
  currentProfile?: FarmerProfile | null;
  lang: 'hi' | 'en';
}

const INDIAN_STATES = [
  'Punjab (पंजाब)',
  'Haryana (हरियाणा)',
  'Uttar Pradesh (उत्तर प्रदेश)',
  'Maharashtra (महाराष्ट्र)',
  'Madhya Pradesh (मध्य प्रदेश)',
  'Gujarat (गुजरात)',
  'Rajasthan (राजस्थान)',
  'Bihar (बिहार)',
  'Karnataka (कर्नाटक)',
  'Andhra Pradesh (आंध्र प्रदेश)',
  'Telangana (तेलंगाना)',
  'Tamil Nadu (तमिलनाडु)',
  'West Bengal (पश्चिम बंगाल)',
  'Odisha (ओडिशा)',
  'Chhattisgarh (छत्तीसगढ़)',
  'Jharkhand (झारखंड)',
  'Uttarakhand (उत्तराखंड)',
  'Himachal Pradesh (हिमाचल प्रदेश)',
];

const COMMON_CROPS = [
  'Wheat (गेहूं)',
  'Paddy / Basmati Rice (धान / बासमती)',
  'Mustard / Sarson (सरसों)',
  'Cotton / Kapas (कपास)',
  'Sugarcane / Ganna (गन्ना)',
  'Soybean (सोयाबीन)',
  'Gram / Chana (चना)',
  'Maize / Makka (मक्का)',
  'Groundnut (मूंगफली)',
  'Potato & Onion (आलू व प्याज)',
  'Vegetables & Fruits (हरी सब्जियां व फल)',
];

export const FarmerProfileModal: React.FC<FarmerProfileModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  currentProfile,
  lang,
}) => {
  const isHi = lang === 'hi';

  const [name, setName] = useState<string>(currentProfile?.name || '');
  const [district, setDistrict] = useState<string>(currentProfile?.district || '');
  const [state, setState] = useState<string>(currentProfile?.state || 'Uttar Pradesh (उत्तर प्रदेश)');
  const [farmlandArea, setFarmlandArea] = useState<string>(currentProfile?.farmlandArea || '4.5 Acres');
  const [cropGrowing, setCropGrowing] = useState<string>(currentProfile?.cropGrowing || 'Wheat (गेहूं)');
  const [phone, setPhone] = useState<string>(currentProfile?.phone || '');
  const [showAdminCode, setShowAdminCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const profile: FarmerProfile = {
      name: name.trim(),
      district: district.trim() || 'Greater Noida',
      state: state.split(' ')[0],
      farmlandArea: farmlandArea.trim() || '4.5 Acres',
      cropGrowing: cropGrowing || 'Wheat',
      phone: phone.trim(),
      registeredAt: new Date().toISOString(),
    };

    onSaveProfile(profile);
    onClose();
  };

  const adminOneLiner = `const { farmers } = await (await fetch('${window.location.origin}/api/admin/farmers')).json();`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(adminOneLiner);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-slate-950 p-6 shadow-2xl text-white max-h-[92vh] flex flex-col overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/50">
              <Wheat className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>{isHi ? 'किसान विवरण व खेत पंजीकरण' : 'Farmer & Farmland Registration'}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isHi
                  ? 'मौसम, हवा व फसल जोखिम की सटीक सलाह के लिए अपनी जानकारी दर्ज करें'
                  : 'Enter farm profile for tailored agromet advisory & admin dashboard synchronization'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-3.5 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {/* 1. Farmer Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              {isHi ? 'किसान का नाम (Farmer Name) *' : 'Farmer Full Name *'}
            </label>
            <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs focus-within:border-emerald-500">
              <User className="h-4 w-4 text-emerald-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isHi ? 'उदा. बलविंदर सिंह / रमेश पाटिल' : 'e.g. Ramesh Patel / Balwinder Singh'}
                className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-xs"
              />
            </div>
          </div>

          {/* 2. State & District */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isHi ? 'राज्य (State) *' : 'State *'}
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              >
                {INDIAN_STATES.map((st, idx) => (
                  <option key={idx} value={st} className="bg-slate-900 text-white">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isHi ? 'जिला / तहसील (District) *' : 'District / Tehsil *'}
              </label>
              <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs focus-within:border-emerald-500">
                <MapPin className="h-4 w-4 text-emerald-400 mr-2 shrink-0" />
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={isHi ? 'उदा. ग्रेटर नोएडा / जैसलमेर / मेरठ' : 'e.g. Greater Noida / Jaisalmer / Meerut'}
                  className="w-full bg-transparent text-white outline-none placeholder-slate-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 3. Farmland Area & Crop */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isHi ? 'खेत का रकबा / आकार (Farmland Area) *' : 'Farmland Area *'}
              </label>
              <input
                type="text"
                required
                value={farmlandArea}
                onChange={(e) => setFarmlandArea(e.target.value)}
                placeholder={isHi ? 'उदा. 5 Acres / 8 बीघा' : 'e.g. 5 Acres / 2 Hectares'}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isHi ? 'मुख्य बोई गई फसल (Crop Growing) *' : 'Crop Growing *'}
              </label>
              <select
                value={cropGrowing}
                onChange={(e) => setCropGrowing(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              >
                {COMMON_CROPS.map((c, idx) => (
                  <option key={idx} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Phone (Optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              {isHi ? 'मोबाइल नंबर (वैकल्पिक - मौसम SMS अलर्ट हेतु)' : 'Mobile Number (Optional)'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>

          {/* 5. One-Line Admin Connection Accordion */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3">
            <div
              onClick={() => setShowAdminCode(!showAdminCode)}
              className="flex items-center justify-between cursor-pointer text-cyan-300 font-semibold text-xs"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>🔌 {isHi ? '1-लाइन एडमिन पैनल एकीकरण' : '1-Line Admin Panel Integration'}</span>
              </div>
              <span className="text-[10px] text-cyan-400 underline">
                {showAdminCode ? (isHi ? 'छिपाएं' : 'Hide') : isHi ? 'कोड देखें' : 'View Code'}
              </span>
            </div>

            {showAdminCode && (
              <div className="mt-2.5 pt-2 border-t border-cyan-500/20 space-y-2 text-[11px] text-slate-300">
                <p>
                  {isHi
                    ? 'आपके दूसरे एडमिन ऐप में सभी किसान प्रोफाइल्स को केवल इस 1-लाइन कोड से तुरंत प्राप्त करें:'
                    : 'Fetch all registered farmer profiles in your external admin app with this 1-line call:'}
                </p>
                <div className="relative rounded-xl bg-black/60 p-2 font-mono text-[10px] text-cyan-300 overflow-x-auto border border-cyan-500/30">
                  <code>{adminOneLiner}</code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300 hover:bg-cyan-500/30"
                  >
                    {copiedCode ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enter Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 py-3 text-xs font-bold text-white shadow-xl shadow-emerald-950/50 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition"
            >
              <span>{isHi ? 'दर्ज करें और लाइव मौसम रडार खोलें' : 'Enter & Open Live Agro Radar'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
