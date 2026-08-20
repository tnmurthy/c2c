interface BootScreenProps {
  bootProgress: number;
}

export default function BootScreen({ bootProgress }: BootScreenProps) {
  return (
    <div className="absolute inset-0 bg-[#000] z-[9999] flex flex-col justify-between p-16 text-white font-mono select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Retro Windows Cloud Emblem */}
        <div className="text-center">
          <div className="text-6xl font-sans font-black tracking-tighter text-blue-500 italic mb-2 select-none">
            Microsoft
          </div>
          <div className="text-4xl font-sans font-bold tracking-tight text-white mb-8 select-none">
            Windows<span className="text-red-500 text-2xl font-black align-super">95</span>
          </div>
        </div>
        {/* Loading Progress Bar */}
        <div className="w-64 h-6 border-2 border-white p-1 rounded-none flex items-center overflow-hidden bg-[#000]">
          <div
            className="h-full bg-blue-600 transition-all duration-100 ease-out"
            style={{ width: `${bootProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-2">Initializing Dossier System</p>
      </div>
      <div className="flex justify-between items-center text-[10px] text-gray-600 uppercase font-black tracking-widest">
        <span>Core Version 4.00.950</span>
        <span>Campus to Corporate (C2C) Matrix</span>
      </div>
    </div>
  );
}
