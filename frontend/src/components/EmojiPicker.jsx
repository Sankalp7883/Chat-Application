import React, { useState, useMemo } from 'react';

const EMOJI_DATA = {
  "Smileys": [
    { emoji: "😀", name: "grinning face", keywords: ["happy", "smile", "joy"] },
    { emoji: "😃", name: "grinning face with big eyes", keywords: ["happy", "smile", "joy"] },
    { emoji: "😄", name: "grinning face with smiling eyes", keywords: ["happy", "smile", "joy"] },
    { emoji: "😁", name: "beaming face with smiling eyes", keywords: ["happy", "smile", "joy", "grin"] },
    { emoji: "😆", name: "grinning squinting face", keywords: ["happy", "smile", "laugh"] },
    { emoji: "😅", name: "grinning face with sweat", keywords: ["happy", "smile", "sweat", "nervous"] },
    { emoji: "🤣", name: "rolling on the floor laughing", keywords: ["laugh", "lol", "rofl"] },
    { emoji: "😂", name: "face with tears of joy", keywords: ["laugh", "lol", "crying", "happy"] },
    { emoji: "🙂", name: "slightly smiling face", keywords: ["happy", "smile", "casual"] },
    { emoji: "🙃", name: "upside-down face", keywords: ["sarcasm", "silly", "flip"] },
    { emoji: "😉", name: "winking face", keywords: ["wink", "flirt"] },
    { emoji: "😊", name: "smiling face with smiling eyes", keywords: ["happy", "smile", "blush", "kind"] },
    { emoji: "😇", name: "smiling face with halo", keywords: ["angel", "innocent", "good"] },
    { emoji: "🥰", name: "smiling face with hearts", keywords: ["love", "affection", "warm"] },
    { emoji: "😍", name: "smiling face with heart-eyes", keywords: ["love", "crush", "adoration"] },
    { emoji: "🤩", name: "star-struck", keywords: ["excited", "amazing", "wow"] },
    { emoji: "😘", name: "face blowing a kiss", keywords: ["love", "kiss", "flirt"] },
    { emoji: "😋", name: "face savoring food", keywords: ["yummy", "hungry", "delicious"] },
    { emoji: "😛", name: "face with tongue", keywords: ["tongue", "silly", "tease"] },
    { emoji: "😜", name: "winking face with tongue", keywords: ["wink", "tongue", "silly", "tease"] },
    { emoji: "🤪", name: "zany face", keywords: ["crazy", "silly", "goofy"] },
    { emoji: "🤑", name: "money-mouth face", keywords: ["money", "rich", "dollar"] },
    { emoji: "🤗", name: "hugging face", keywords: ["hug", "friendly", "welcome"] },
    { emoji: "🤫", name: "shushing face", keywords: ["quiet", "silence", "shh"] },
    { emoji: "🤔", name: "thinking face", keywords: ["think", "wonder", "hmm"] },
    { emoji: "🤐", name: "zipper-mouth face", keywords: ["quiet", "secret", "sealed"] },
    { emoji: "🤨", name: "face with raised eyebrow", keywords: ["skeptical", "unsure", "huh"] },
    { emoji: "😐", name: "neutral face", keywords: ["meh", "neutral", "okay"] },
    { emoji: "😑", name: "expressionless face", keywords: ["meh", "flat", "blank"] },
    { emoji: "😏", name: "smirking face", keywords: ["smirk", "sly", "flirt"] },
    { emoji: "😒", name: "unamused face", keywords: ["bored", "annoyed", "meh"] },
    { emoji: "🙄", name: "face with rolling eyes", keywords: ["rolling eyes", "annoyed", "whatever"] },
    { emoji: "😬", name: "grimacing face", keywords: ["awkward", "oops", "nervous"] },
    { emoji: "😌", name: "relieved face", keywords: ["relieved", "calm", "peace"] },
    { emoji: "😔", name: "pensive face", keywords: ["sad", "sorry", "thoughtful"] },
    { emoji: "😴", name: "sleeping face", keywords: ["sleep", "zzz", "tired"] },
    { emoji: "🥵", name: "hot face", keywords: ["hot", "sunburn", "sweat"] },
    { emoji: "🥶", name: "cold face", keywords: ["cold", "freeze", "ice"] },
    { emoji: "🤯", name: "exploding head", keywords: ["mind blown", "shocked", "wow"] },
    { emoji: "🥳", name: "partying face", keywords: ["party", "celebrate", "birthday"] },
    { emoji: "😎", name: "smiling face with sunglasses", keywords: ["cool", "glasses", "swagger"] },
    { emoji: "🤓", name: "nerd face", keywords: ["nerd", "smart", "geek"] },
    { emoji: "🧐", name: "face with monocle", keywords: ["smart", "fancy", "skeptical"] },
    { emoji: "😕", name: "confused face", keywords: ["confused", "unsure"] },
    { emoji: "🥺", name: "pleading face", keywords: ["plead", "beg", "sad", "cute"] },
    { emoji: "😢", name: "crying face", keywords: ["cry", "sad", "tear"] },
    { emoji: "😭", name: "loudly crying face", keywords: ["cry", "sad", "sobbing", "tears"] },
    { emoji: "😱", name: "face screaming in fear", keywords: ["scream", "scared", "horror"] },
    { emoji: "😡", name: "pouting face", keywords: ["angry", "mad", "rage"] },
    { emoji: "😠", name: "angry face", keywords: ["angry", "mad"] },
    { emoji: "😈", name: "smiling face with horns", keywords: ["devil", "evil", "mischievous"] },
    { emoji: "💀", name: "skull", keywords: ["dead", "skeleton", "death"] },
    { emoji: "💩", name: "pile of poo", keywords: ["poop", "poo"] },
    { emoji: "👻", name: "ghost", keywords: ["ghost", "spooky", "halloween"] },
    { emoji: "👽", name: "alien", keywords: ["alien", "space"] },
    { emoji: "🤖", name: "robot", keywords: ["robot", "tech"] }
  ],
  "Gestures": [
    { emoji: "👋", name: "waving hand", keywords: ["wave", "hello", "goodbye"] },
    { emoji: "🤚", name: "raised back of hand", keywords: ["raised hand"] },
    { emoji: "🖐️", name: "hand with fingers splayed", keywords: ["hand", "five"] },
    { emoji: "✋", name: "raised hand", keywords: ["hand", "stop"] },
    { emoji: "👌", name: "OK hand", keywords: ["ok", "perfect", "agree"] },
    { emoji: "🤌", name: "pinched fingers", keywords: ["italian", "what"] },
    { emoji: "🤏", name: "pinching hand", keywords: ["small", "little"] },
    { emoji: "✌️", name: "victory hand", keywords: ["victory", "peace", "two"] },
    { emoji: "🤞", name: "crossed fingers", keywords: ["luck", "hope"] },
    { emoji: "🤟", name: "love-you gesture", keywords: ["love", "ily"] },
    { emoji: "🤘", name: "sign of the horns", keywords: ["rock", "metal", "horns"] },
    { emoji: "🤙", name: "call me hand", keywords: ["call", "phone", "shaka"] },
    { emoji: "👈", name: "backhand index pointing left", keywords: ["point", "left"] },
    { emoji: "👉", name: "backhand index pointing right", keywords: ["point", "right"] },
    { emoji: "👆", name: "backhand index pointing up", keywords: ["point", "up"] },
    { emoji: "👇", name: "backhand index pointing down", keywords: ["point", "down"] },
    { emoji: "👍", name: "thumbs up", keywords: ["thumbs up", "like", "agree", "good"] },
    { emoji: "👎", name: "thumbs down", keywords: ["thumbs down", "dislike", "bad"] },
    { emoji: "✊", name: "raised fist", keywords: ["fist", "power"] },
    { emoji: "👊", name: "oncoming fist", keywords: ["fist", "punch", "bump"] },
    { emoji: "👏", name: "clapping hands", keywords: ["clap", "applause", "praise"] },
    { emoji: "🙌", name: "raising hands", keywords: ["raised hands", "celebration", "praise"] },
    { emoji: "🤝", name: "handshake", keywords: ["handshake", "agreement", "deal"] },
    { emoji: "🙏", name: "folded hands", keywords: ["please", "thank you", "pray", "highfive"] },
    { emoji: "💪", name: "flexed biceps", keywords: ["flex", "muscle", "strength", "strong"] },
    { emoji: "👀", name: "eyes", keywords: ["eyes", "look", "see", "watch"] },
    { emoji: "👄", name: "mouth", keywords: ["mouth", "lips", "kiss"] }
  ],
  "Hearts": [
    { emoji: "❤️", name: "red heart", keywords: ["heart", "love", "red"] },
    { emoji: "🧡", name: "orange heart", keywords: ["heart", "love", "orange"] },
    { emoji: "💛", name: "yellow heart", keywords: ["heart", "love", "yellow"] },
    { emoji: "💚", name: "green heart", keywords: ["heart", "love", "green"] },
    { emoji: "💙", name: "blue heart", keywords: ["heart", "love", "blue"] },
    { emoji: "💜", name: "purple heart", keywords: ["heart", "love", "purple"] },
    { emoji: "🖤", name: "black heart", keywords: ["heart", "love", "black"] },
    { emoji: "🤍", name: "white heart", keywords: ["heart", "love", "white"] },
    { emoji: "🤎", name: "brown heart", keywords: ["heart", "love", "brown"] },
    { emoji: "💔", name: "broken heart", keywords: ["heart", "broken", "sad"] },
    { emoji: "❣️", name: "heart exclamation", keywords: ["heart", "exclamation"] },
    { emoji: "💕", name: "two hearts", keywords: ["hearts", "love"] },
    { emoji: "💞", name: "revolving hearts", keywords: ["hearts", "love"] },
    { emoji: "💓", name: "beating heart", keywords: ["heart", "beating", "love"] },
    { emoji: "💗", name: "growing heart", keywords: ["heart", "growing"] },
    { emoji: "💖", name: "sparkling heart", keywords: ["heart", "sparkling"] },
    { emoji: "💘", name: "heart with arrow", keywords: ["heart", "arrow", "cupid"] },
    { emoji: "💝", name: "heart with ribbon", keywords: ["heart", "gift"] },
    { emoji: "🔥", name: "fire", keywords: ["fire", "hot", "cool", "lit"] },
    { emoji: "✨", name: "sparkles", keywords: ["sparkle", "stars", "shiny"] },
    { emoji: "🌟", name: "glowing star", keywords: ["star", "glow"] },
    { emoji: "⭐", name: "star", keywords: ["star"] },
    { emoji: "💥", name: "collision", keywords: ["boom", "collision", "explode"] },
    { emoji: "💯", name: "hundred points", keywords: ["100", "perfect", "score"] },
    { emoji: "🎉", name: "party popper", keywords: ["party", "celebration", "popper"] },
    { emoji: "🎈", name: "balloon", keywords: ["balloon", "celebrate"] }
  ],
  "Nature": [
    { emoji: "🐶", name: "dog face", keywords: ["dog", "puppy", "pet"] },
    { emoji: "🐱", name: "cat face", keywords: ["cat", "kitten", "pet"] },
    { emoji: "🐭", name: "mouse face", keywords: ["mouse", "rodent"] },
    { emoji: "🐹", name: "hamster", keywords: ["hamster", "pet"] },
    { emoji: "🐰", name: "rabbit face", keywords: ["rabbit", "bunny"] },
    { emoji: "🦊", name: "fox", keywords: ["fox", "nature"] },
    { emoji: " BEAR", name: "bear", keywords: ["bear", "nature"] },
    { emoji: "🐼", name: "panda", keywords: ["panda", "nature"] },
    { emoji: "🐨", name: "koala", keywords: ["koala", "nature"] },
    { emoji: "🐯", name: "tiger face", keywords: ["tiger", "wild"] },
    { emoji: "🦁", name: "lion", keywords: ["lion", "wild"] },
    { emoji: "🐮", name: "cow face", keywords: ["cow", "farm"] },
    { emoji: "🐷", name: "pig face", keywords: ["pig", "farm"] },
    { emoji: "🐸", name: "frog", keywords: ["frog", "amphibian"] },
    { emoji: "🐵", name: "monkey face", keywords: ["monkey", "animal"] },
    { emoji: "🐔", name: "chicken", keywords: ["chicken", "bird"] },
    { emoji: "🐧", name: "penguin", keywords: ["penguin", "antarctica"] },
    { emoji: "🐦", name: "bird", keywords: ["bird", "nature"] },
    { emoji: "🐤", name: "baby chick", keywords: ["chick", "baby"] },
    { emoji: "🦆", name: "duck", keywords: ["duck", "bird"] },
    { emoji: "🦅", name: "eagle", keywords: ["eagle", "bird", "wild"] },
    { emoji: "🦉", name: "owl", keywords: ["owl", "bird"] },
    { emoji: "🐝", name: "honeybee", keywords: ["bee", "bug", "honey"] },
    { emoji: "🐛", name: "bug", keywords: ["bug", "worm"] },
    { emoji: "🦋", name: "butterfly", keywords: ["butterfly", "bug"] },
    { emoji: "🐌", name: "snail", keywords: ["snail", "bug"] },
    { emoji: "🐞", name: "lady beetle", keywords: ["ladybug", "bug"] },
    { emoji: "🐜", name: "ant", keywords: ["ant", "bug"] },
    { emoji: "🕷️", name: "spider", keywords: ["spider", "bug", "spooky"] },
    { emoji: "🐢", name: "turtle", keywords: ["turtle", "reptile"] },
    { emoji: "🐍", name: "snake", keywords: ["snake", "reptile"] },
    { emoji: "🐙", name: "octopus", keywords: ["octopus", "ocean"] },
    { emoji: "🐠", name: "tropical fish", keywords: ["fish", "ocean"] },
    { emoji: "🐬", name: "dolphin", keywords: ["dolphin", "ocean"] },
    { emoji: "🐳", name: "spouting whale", keywords: ["whale", "ocean"] },
    { emoji: "🦈", name: "shark", keywords: ["shark", "ocean"] },
    { emoji: "🐊", name: "crocodile", keywords: ["crocodile", "reptile"] },
    { emoji: "🐘", name: "elephant", keywords: ["elephant"] },
    { emoji: "🐪", name: "camel", keywords: ["camel", "desert"] },
    { emoji: "🦒", name: "giraffe", keywords: ["giraffe"] },
    { emoji: "🐐", name: "goat", keywords: ["goat"] },
    { emoji: "🦌", name: "deer", keywords: ["deer"] },
    { emoji: "🌳", name: "deciduous tree", keywords: ["tree"] },
    { emoji: "🌴", name: "palm tree", keywords: ["tree", "beach"] },
    { emoji: "🌵", name: "cactus", keywords: ["cactus", "desert"] },
    { emoji: "🍀", name: "four leaf clover", keywords: ["clover", "luck"] },
    { emoji: "🍁", name: "maple leaf", keywords: ["leaf", "autumn"] },
    { emoji: "🌸", name: "cherry blossom", keywords: ["flower", "pink"] },
    { emoji: "🌹", name: "rose", keywords: ["flower", "love"] },
    { emoji: "🌻", name: "sunflower", keywords: ["flower", "yellow"] },
    { emoji: "💐", name: "bouquet", keywords: ["flowers", "gift"] },
    { emoji: "🍄", name: "mushroom", keywords: ["mushroom"] }
  ],
  "Food": [
    { emoji: "🍏", name: "green apple", keywords: ["apple", "fruit"] },
    { emoji: "🍎", name: "red apple", keywords: ["apple", "fruit"] },
    { emoji: "🍊", name: "tangerine", keywords: ["orange", "fruit"] },
    { emoji: "🍋", name: "lemon", keywords: ["lemon", "fruit"] },
    { emoji: "🍌", name: "banana", keywords: ["banana", "fruit"] },
    { emoji: "🍉", name: "watermelon", keywords: ["watermelon", "fruit"] },
    { emoji: "🍇", name: "grapes", keywords: ["grapes", "fruit"] },
    { emoji: "🍓", name: "strawberry", keywords: ["strawberry", "fruit"] },
    { emoji: "🍒", name: "cherries", keywords: ["cherries", "fruit"] },
    { emoji: "🍑", name: "peach", keywords: ["peach", "fruit"] },
    { emoji: "🍍", name: "pineapple", keywords: ["pineapple", "fruit"] },
    { emoji: "🍅", name: "tomato", keywords: ["tomato", "vegetable"] },
    { emoji: "茄", name: "eggplant", keywords: ["eggplant", "vegetable"] },
    { emoji: "🥑", name: "avocado", keywords: ["avocado", "fruit"] },
    { emoji: "🥦", name: "broccoli", keywords: ["broccoli", "vegetable"] },
    { emoji: "🌶️", name: "hot pepper", keywords: ["chili", "hot", "spicy"] },
    { emoji: "🌽", name: "ear of corn", keywords: ["corn", "vegetable"] },
    { emoji: "🥕", name: "carrot", keywords: ["carrot", "vegetable"] },
    { emoji: "🥐", name: "croissant", keywords: ["bread", "bakery"] },
    { emoji: "🍞", name: "bread", keywords: ["bread", "toast"] },
    { emoji: "🥞", name: "pancakes", keywords: ["breakfast"] },
    { emoji: "🧀", name: "cheese wedge", keywords: ["cheese"] },
    { emoji: "🍖", name: "meat on bone", keywords: ["meat", "bbq"] },
    { emoji: "🍗", name: "poultry leg", keywords: ["chicken", "drumstick"] },
    { emoji: "🍔", name: "hamburger", keywords: ["burger", "fastfood"] },
    { emoji: "🍟", name: "french fries", keywords: ["fries", "fastfood"] },
    { emoji: "🍕", name: "pizza", keywords: ["pizza", "fastfood"] },
    { emoji: "🌭", name: "hot dog", keywords: ["hotdog", "fastfood"] },
    { emoji: "🌮", name: "taco", keywords: ["taco", "mexican"] },
    { emoji: "🍳", name: "cooking", keywords: ["egg", "breakfast"] },
    { emoji: "🥗", name: "green salad", keywords: ["salad", "healthy"] },
    { emoji: "popcorn", name: "popcorn", keywords: ["popcorn", "movie"] },
    { emoji: "🍜", name: "steaming bowl", keywords: ["ramen", "noodles"] },
    { emoji: "🍝", name: "spaghetti", keywords: ["pasta", "italian"] },
    { emoji: "🍣", name: "sushi", keywords: ["sushi", "japanese"] },
    { emoji: "🍦", name: "soft ice cream", keywords: ["icecream", "sweet"] },
    { emoji: "🍩", name: "donut", keywords: ["donut", "sweet"] },
    { emoji: "🍪", name: "cookie", keywords: ["cookie", "sweet"] },
    { emoji: "🎂", name: "birthday cake", keywords: ["cake", "birthday"] },
    { emoji: "🍫", name: "chocolate bar", keywords: ["chocolate", "sweet"] },
    { emoji: "☕", name: "hot beverage", keywords: ["coffee", "tea", "cafe"] },
    { emoji: "🍺", name: "beer mug", keywords: ["beer", "alcohol"] },
    { emoji: "🍻", name: "clinking beer mugs", keywords: ["beer", "cheers", "celebrate"] },
    { emoji: "🍷", name: "wine glass", keywords: ["wine", "alcohol"] },
    { emoji: "🥤", name: "cup with straw", keywords: ["drink", "soda"] }
  ],
  "Objects": [
    { emoji: "⌚", name: "watch", keywords: ["time", "watch"] },
    { emoji: "📱", name: "mobile phone", keywords: ["phone", "tech"] },
    { emoji: "💻", name: "laptop", keywords: ["computer", "work", "tech"] },
    { emoji: "🖥️", name: "desktop computer", keywords: ["computer", "tech"] },
    { emoji: "📷", name: "camera", keywords: ["camera", "photo"] },
    { emoji: "📺", name: "television", keywords: ["tv"] },
    { emoji: "🎙️", name: "studio microphone", keywords: ["mic", "podcast"] },
    { emoji: "⏰", name: "alarm clock", keywords: ["time", "alarm"] },
    { emoji: "🔋", name: "battery", keywords: ["battery", "power"] },
    { emoji: "💡", name: "light bulb", keywords: ["light", "idea"] },
    { emoji: "💵", name: "dollar banknote", keywords: ["money", "cash"] },
    { emoji: "🛒", name: "shopping cart", keywords: ["shop", "cart"] },
    { emoji: "✉️", name: "envelope", keywords: ["mail", "letter"] },
    { emoji: "📝", name: "memo", keywords: ["write", "note"] },
    { emoji: "📅", name: "calendar", keywords: ["date", "calendar"] },
    { emoji: "📚", name: "books", keywords: ["books", "study"] },
    { emoji: "✏️", name: "pencil", keywords: ["write"] },
    { emoji: "📎", name: "paperclip", keywords: ["clip", "attach"] },
    { emoji: "🔒", name: "locked", keywords: ["lock", "secure"] },
    { emoji: "🔓", name: "unlocked", keywords: ["lock", "open"] },
    { emoji: "🔍", name: "magnifying glass tilted left", keywords: ["search", "find"] }
  ]
};

export default function EmojiPicker({ onEmojiSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Smileys');

  const categories = Object.keys(EMOJI_DATA);

  const filteredEmojis = useMemo(() => {
    if (!searchTerm.trim()) {
      return EMOJI_DATA[activeCategory] || [];
    }
    const lowerSearch = searchTerm.toLowerCase().trim();
    const results = [];
    
    // Search across all categories
    Object.values(EMOJI_DATA).forEach((categoryList) => {
      categoryList.forEach((item) => {
        const matchesName = item.name.toLowerCase().includes(lowerSearch);
        const matchesKeywords = item.keywords.some((k) => k.toLowerCase().includes(lowerSearch));
        if (matchesName || matchesKeywords) {
          // Avoid duplicates in results if same emoji exists in multiple sections
          if (!results.some((r) => r.emoji === item.emoji)) {
            results.push(item);
          }
        }
      });
    });
    return results;
  }, [searchTerm, activeCategory]);

  return (
    <div 
      className="emoji-picker-container card border-0 shadow-lg p-2 bg-white" 
      style={{ 
        width: '320px', 
        maxHeight: '400px', 
        borderRadius: '12px', 
        zIndex: 1000,
        position: 'absolute',
        bottom: '80px',
        right: '10px',
        border: '1px solid #e2e8f0'
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
        <span className="fw-bold text-secondary" style={{ fontSize: '0.9rem' }}>Emojis</span>
        {onClose && (
          <button 
            type="button" 
            className="btn-close" 
            style={{ fontSize: '0.75rem' }} 
            onClick={onClose}
          ></button>
        )}
      </div>

      {/* Search input */}
      <div className="mb-2">
        <input
          type="text"
          className="form-control form-control-sm border-light-subtle rounded-pill bg-light"
          placeholder="Search emojis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      {/* Category selector (only if not searching) */}
      {!searchTerm && (
        <div 
          className="d-flex overflow-x-auto pb-1 mb-2 border-bottom" 
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            gap: '8px'
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm py-0.5 px-2.5 rounded-pill text-nowrap fw-semibold ${activeCategory === cat ? 'btn-success text-white' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div 
        className="emoji-grid d-flex flex-wrap gap-2 justify-content-start overflow-y-auto px-1 py-1"
        style={{ 
          height: '240px',
          contentVisibility: 'auto'
        }}
      >
        {filteredEmojis.length === 0 ? (
          <div className="w-100 text-center text-muted small py-4">
            No emojis found
          </div>
        ) : (
          filteredEmojis.map((item, idx) => (
            <button
              key={`${item.emoji}-${idx}`}
              type="button"
              className="btn btn-light d-flex justify-content-center align-items-center p-0 rounded-circle emoji-btn"
              style={{ 
                width: '38px', 
                height: '38px', 
                fontSize: '1.45rem',
                border: 'none',
                background: 'transparent',
                transition: 'transform 0.15s ease, background 0.15s ease'
              }}
              title={item.name}
              onClick={() => onEmojiSelect(item.emoji)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)';
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
