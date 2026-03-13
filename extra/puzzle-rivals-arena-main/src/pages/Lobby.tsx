import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/engine/gameContext';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import { ArrowLeft, Check, Loader2, Copy } from 'lucide-react';

export default function Lobby() {
  const navigate = useNavigate();
  const { match, setReady, proceedToAnnouncement, goHome } = useGame();
  const [copied, setCopied] = useState(false);

  const allReady = match.players.every(p => p.isReady);

  useEffect(() => {
    if (allReady) {
      const t = setTimeout(() => {
        proceedToAnnouncement();
        navigate('/game');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [allReady, proceedToAnnouncement, navigate]);

  const handleBack = () => { goHome(); navigate('/'); };
  const copyCode = () => {
    navigator.clipboard?.writeText(match.lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 pt-6 flex items-center gap-3">
        <button onClick={handleBack} className="text-muted-foreground active:scale-90"><ArrowLeft size={24} /></button>
        <h1 className="font-bold text-lg text-foreground">Lobby</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Room code */}
        <button onClick={copyCode} className="flex items-center gap-2 bg-card rounded-xl px-4 py-2 active:scale-95 transition-transform">
          <span className="font-hud text-xs text-muted-foreground">Room</span>
          <span className="font-hud text-lg font-bold text-primary tracking-widest">{match.lobbyCode}</span>
          {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
        </button>

        {/* Players */}
        <div className="flex gap-8 items-center">
          {match.players.map((p, i) => (
            <motion.div key={p.profile.id} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <PlayerAvatar avatar={p.profile.avatar} frame={p.profile.avatarFrame} size={64} />
              <span className="font-bold text-sm text-foreground">{p.profile.name}</span>
              <span className="font-hud text-xs text-muted-foreground">{p.profile.rank} · {p.profile.rating}</span>
              <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-hud font-bold ${
                p.isReady ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {p.isReady ? <><Check size={12} /> Ready</> : <><Loader2 size={12} className="animate-spin" /> Waiting</>}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="font-hud text-xl text-muted-foreground font-bold">VS</div>

        {!match.players[0]?.isReady && (
          <Button variant="play" size="xl" onClick={setReady} className="w-full max-w-xs">
            READY
          </Button>
        )}

        {allReady && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-hud text-primary font-bold text-lg animate-count-pulse">
            Starting...
          </motion.div>
        )}
      </div>
    </div>
  );
}
