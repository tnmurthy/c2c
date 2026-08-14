interface DosWindowProps {
  terminalHistory: string[];
  terminalInput: string;
  onTerminalInputChange: (value: string) => void;
  onTerminalSubmit: (e: React.FormEvent) => void;
}

export default function DosWindow({
  terminalHistory,
  terminalInput,
  onTerminalInputChange,
  onTerminalSubmit,
}: DosWindowProps) {
  return (
    <div className="w-full h-full bg-[#000] text-[#0f0] p-4 font-mono text-xs flex flex-col justify-between overflow-y-auto">
      <div className="flex-1 whitespace-pre-wrap select-text mb-4">
        {terminalHistory.map((line, idx) => (
          <div key={idx} className="min-h-[1.2em]">{line}</div>
        ))}
      </div>
      <form onSubmit={onTerminalSubmit} className="flex gap-2 items-center">
        <span className="shrink-0">C:\&gt;</span>
        <input
          type="text"
          value={terminalInput}
          onChange={(e) => onTerminalInputChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[#0f0] font-mono text-xs select-text focus:ring-0"
          autoFocus
        />
      </form>
    </div>
  );
}
