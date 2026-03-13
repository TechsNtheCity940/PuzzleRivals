import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/engine/gameContext';
import { Zap, KeyRound, ArrowLeft } from 'lucide-react';

export default function Matchmaking() {
  const navigate = useNavigate();
  const { startQuickMatch, joinRoom } = useGame();
  const [mode, setMode] = useState<'select' | 'join'>('select');
  const [code, setCode] = useState('');

  const handleQuick = () => {
    startQuickMatch();
    navigate('/lobby');
  };

  const handleJoin = () => {
    if (code.length >= 4) {
      joinRoom(code.toUpperCase());
      navigate('/lobby');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 pt-6 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-foreground">Find Match</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {mode === 'select' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs flex flex-col gap-4">
            <Button variant="play" size="xl" className="w-full" onClick={handleQuick}>
              <Zap size={22} /> Quick Match
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => setMode('join')}>
              <KeyRound size={18} /> Join with Code
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs flex flex-col gap-4 items-center">
            <p className="font-hud text-sm text-muted-foreground">Enter room code</p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full text-center text-2xl font-hud font-bold tracking-[0.3em] bg-card border-2 border-border rounded-xl h-14 text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
            />
            <Button variant="play" size="lg" className="w-full" onClick={handleJoin} disabled={code.length < 4}>
              Join Room
            </Button>
            <button onClick={() => setMode('select')} className="text-sm text-muted-foreground font-hud underline">Back</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
