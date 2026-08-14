import { useState } from 'react';

const INITIAL_HISTORY: string[] = [
  'Microsoft(R) Windows 95',
  '(C)Copyright Microsoft Corp 1981-1995.',
  '',
  'C:\\> type readme.txt',
  'Welcome to the Campus to Corporate (C2C) retro compiler.',
  'Type "help" to list available command parameters.',
  '',
  'C:\\>'
];

/**
 * Owns the DOS terminal window's command history and input handling.
 * `onExit` is called when the user types `exit` so the caller can close
 * the DOS window.
 */
export function useTerminal(studentData: any, assessment: any, onExit: () => void) {
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>(INITIAL_HISTORY);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = terminalInput.trim().toLowerCase();
    let reply: string[] = [];

    if (input === 'help') {
      reply = [
        'Available commands:',
        '  HELP       - Lists available command keys.',
        '  DIR        - Lists dossier files on system.',
        '  CAT <file> - Reads file content (e.g. cat resume.txt).',
        '  SCORES     - Prints evaluated dimension vectors.',
        '  CLEAR      - Resets terminal log.',
        '  EXIT       - Closes MS-DOS prompt window.'
      ];
    } else if (input === 'dir') {
      reply = [
        ' Volume in drive C has no label.',
        ' Directory of C:\\',
        '',
        '06/17/2026  12:00 PM    <DIR>          featured_vectors',
        '06/17/2026  12:00 PM             1,024 resume.txt',
        '06/17/2026  12:00 PM               412 scores.log',
        '               2 File(s)          1,436 bytes',
        '               1 Dir(s)     92,120,442 bytes free'
      ];
    } else if (input === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (input === 'exit') {
      onExit();
      setTerminalInput('');
      return;
    } else if (input === 'scores') {
      if (assessment && assessment.dimension_scores) {
        reply = ['C2C Neural Cognitive Vector Scores:', '------------------------------------'];
        Object.entries(assessment.dimension_scores).forEach(([dim, sc]) => {
          reply.push(`  ${dim.toUpperCase()}: ${sc}/100`);
        });
      } else {
        reply = ['No assessed scores matching current operator profile found.'];
      }
    } else if (input.startsWith('cat ')) {
      const filename = input.substring(4).trim();
      if (filename === 'resume.txt') {
        reply = [
          `Candidate: ${studentData?.full_name || 'N/A'}`,
          `Department: ${studentData?.department || 'N/A'}`,
          `Graduation: ${studentData?.graduation_year || 'N/A'}`,
          `Primary Archetype: ${assessment?.primary_profile || 'Unknown'}`
        ];
      } else if (filename === 'scores.log') {
        reply = [
          'Evaluated Matrix Status: STABLE',
          `Archetype: ${assessment?.primary_profile || 'N/A'}`,
          `Primary Dimension Vector: ${assessment?.primary_profile === 'Builder' ? 'IQ + AQ' : 'EQ + SQ'}`
        ];
      } else {
        reply = [`File not found: ${filename}`];
      }
    } else if (input) {
      reply = [`Bad command or filename: "${terminalInput}"`];
    }

    setTerminalHistory(prev => [...prev, `C:\\> ${terminalInput}`, ...reply, '']);
    setTerminalInput('');
  };

  return {
    terminalInput,
    setTerminalInput,
    terminalHistory,
    handleTerminalSubmit,
  };
}
