interface MobileAppMenuProps {
  onOpenWindow: (windowId: string) => void;
}

const MOBILE_APPS = [
  { id: 'about', label: '💻 My Computer', desc: 'View cognitive archetype details' },
  { id: 'resume', label: '📝 My Resume', desc: 'Access educational & score records' },
  { id: 'projects', label: '📁 Competencies', desc: 'Inspect dimension quotient density' },
  { id: 'scores', label: '📊 CogMatrix', desc: 'Review developmental feedback directives' },
  { id: 'dos', label: '📟 MS-DOS Shell', desc: 'Run low-level console diagnostics' },
  { id: 'cv_tailor', label: '👔 CV Tailor', desc: 'Tailor resume & cover letters' },
];

export default function MobileAppMenu({ onOpenWindow }: MobileAppMenuProps) {
  return (
    <div className="absolute inset-x-0 top-0 bottom-10 bg-[#000080] text-[#c0c0c0] font-mono p-4 flex flex-col z-[1]">
      <div className="border-2 border-double border-white p-4 flex-1 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="text-center text-white bg-blue-800 font-bold px-2 py-1 uppercase border-b-2 border-white mb-6">
            === C2C COGNITIVE DIRECTORY ===
          </div>
          <p className="text-xs text-cyan-300 mb-6 text-center leading-relaxed">
            Screen calibration detected: MOBILE NODE.
            Tap an application key below to establish connection.
          </p>

          <div className="space-y-3 max-w-sm mx-auto">
            {MOBILE_APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => onOpenWindow(app.id)}
                className="w-full text-left bg-[#c0c0c0] text-[#000] border-2 border-white border-r-[#808080] border-b-[#808080] p-3 text-xs font-bold font-mono tracking-wider flex flex-col gap-1 active:border-r-white active:border-b-white"
              >
                <span className="text-[#000080] font-bold">{app.label}</span>
                <span className="text-[10px] text-gray-700 font-normal">{app.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-500 uppercase tracking-widest pt-4">
          C2C MOBILE OPERATING SHELL v1.95
        </div>
      </div>
    </div>
  );
}
