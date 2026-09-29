import { useState } from 'react';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '👏', '🙌', '👐'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['🔥', '⭐', '🌟', '💫', '✨', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '📱', '💻', '⌨️', '📷', '🎵', '🎶', '🔔', '📌'],
  'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🥑', '🍔', '🍟', '🍕', '🌮', '🍜', '🍣', '🍰', '☕'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [category, setCategory] = useState('Smileys');

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 rounded-lg shadow-lg overflow-hidden z-50"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      {/* Category tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="flex-1 py-1.5 text-xs"
            style={{
              color: category === cat ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: category === cat ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[category as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
