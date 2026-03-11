import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FightingGame.css';

// Character data
const CHARACTERS = {
  ryu: {
    name: 'Ryu',
    color: '#E53935',
    baseAttack: 8,
    speed: 7,
    defense: 6,
  },
  chun: {
    name: 'Chun-Li',
    color: '#1976D2',
    baseAttack: 7,
    speed: 9,
    defense: 7,
  },
  blanka: {
    name: 'Blanka',
    color: '#00897B',
    baseAttack: 9,
    speed: 6,
    defense: 8,
  },
  guile: {
    name: 'Guile',
    color: '#F57C00',
    baseAttack: 6,
    speed: 5,
    defense: 9,
  },
};

const MOVES = {
  punch: { name: 'Punch', damage: { min: 5, max: 12 }, cooldown: 500 },
  kick: { name: 'Kick', damage: { min: 8, max: 15 }, cooldown: 700 },
  special: { name: 'Special', damage: { min: 15, max: 25 }, cooldown: 2000 },
  block: { name: 'Block', damage: { min: 0, max: 0 }, cooldown: 300, defensive: true },
};

function HealthBar({ health, maxHealth, playerName, isPlayer1 }) {
  const healthPercent = (health / maxHealth) * 100;
  const healthColor = healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#FFC107' : '#F44336';

  return (
    <div className={`health-container ${isPlayer1 ? 'p1' : 'p2'}`}>
      <div className="player-name">{playerName}</div>
      <div className="health-bar-background">
        <motion.div
          className="health-bar-fill"
          style={{ backgroundColor: healthColor }}
          initial={{ width: '100%' }}
          animate={{ width: `${healthPercent}%` }}
          transition={{ duration: 0.3, type: 'spring' }}
        />
      </div>
      <div className="health-text">
        {health} / {maxHealth}
      </div>
    </div>
  );
}

function PlayerCharacter({ character, position, isPlayer1, isAttacking, isBlocking }) {
  return (
    <motion.div
      className={`character ${isAttacking ? 'attacking' : ''} ${isBlocking ? 'blocking' : ''}`}
      animate={{
        x: isAttacking ? (isPlayer1 ? 20 : -20) : 0,
        rotateZ: isBlocking ? (isPlayer1 ? -5 : 5) : 0,
      }}
      transition={{ duration: 0.2 }}
      style={{ color: character.color }}
    >
      <div className="character-sprite">
        {isBlocking && <div className="shield">🛡️</div>}
        <div className="character-body">{isPlayer1 ? '🥋' : '🥋'}</div>
      </div>
    </motion.div>
  );
}

function CombatLog({ logs }) {
  return (
    <div className="combat-log">
      <div className="log-title">Battle Log</div>
      <div className="log-content">
        <AnimatePresence>
          {logs.slice(-5).map((log, idx) => (
            <motion.div
              key={log.id}
              className={`log-entry ${log.type}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FightingGame() {
  // Game state
  const [gameState, setGameState] = useState('characterSelect'); // characterSelect, fighting, gameOver
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  // Fight state
  const [p1Health, setP1Health] = useState(100);
  const [p2Health, setP2Health] = useState(100);
  const [p1Attacking, setP1Attacking] = useState(false);
  const [p2Attacking, setP2Attacking] = useState(false);
  const [p1Blocking, setP1Blocking] = useState(false);
  const [p2Blocking, setP2Blocking] = useState(false);
  const [combatLogs, setCombatLogs] = useState([]);
  const [turn, setTurn] = useState('p1'); // whose turn it is
  const [p1Cooldowns, setP1Cooldowns] = useState({});
  const [p2Cooldowns, setP2Cooldowns] = useState({});
  const [winner, setWinner] = useState(null);

  const MAX_HEALTH = 100;
  const logIdRef = React.useRef(0);

  // Add log entry
  const addLog = (text, type = 'neutral') => {
    setCombatLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, text, type },
    ]);
  };

  // Character selection
  const selectCharacters = (char1Key, char2Key) => {
    setPlayer1({ key: char1Key, ...CHARACTERS[char1Key] });
    setPlayer2({ key: char2Key, ...CHARACTERS[char2Key] });
    setP1Health(MAX_HEALTH);
    setP2Health(MAX_HEALTH);
    setCombatLogs([]);
    setGameState('fighting');
    addLog(`${CHARACTERS[char1Key].name} vs ${CHARACTERS[char2Key].name}!`, 'neutral');
    addLog('Fight started! Player 1 begins...', 'neutral');
  };

  // Check if move is on cooldown
  const isOnCooldown = (moveKey, cooldowns) => {
    return cooldowns[moveKey] && cooldowns[moveKey] > Date.now();
  };

  // Calculate damage with variance
  const calculateDamage = (attacker, move, defender, isBlocking) => {
    const { min, max } = move.damage;
    let damage = Math.floor(Math.random() * (max - min + 1)) + min;

    // Add attacker stats
    damage += attacker.baseAttack;

    // Reduce damage based on defender's defense
    damage = Math.max(1, damage - Math.floor(defender.defense / 2));

    // Blocking reduces damage by 50%
    if (isBlocking) {
      damage = Math.floor(damage / 2);
    }

    return damage;
  };

  // Handle player move
  const handleMove = (moveKey, isPlayer1) => {
    if (gameState !== 'fighting') return;
    if (turn !== (isPlayer1 ? 'p1' : 'p2')) return;

    const attacker = isPlayer1 ? player1 : player2;
    const defender = isPlayer1 ? player2 : player1;
    const move = MOVES[moveKey];
    const cooldowns = isPlayer1 ? p1Cooldowns : p2Cooldowns;

    // Check cooldown
    if (isOnCooldown(moveKey, cooldowns)) {
      addLog(`${attacker.name} move is on cooldown!`, 'cooldown');
      return;
    }

    // Handle block
    if (moveKey === 'block') {
      if (isPlayer1) {
        setP1Blocking(true);
        setP1Cooldowns((prev) => ({
          ...prev,
          block: Date.now() + move.cooldown,
        }));
      } else {
        setP2Blocking(true);
        setP2Cooldowns((prev) => ({
          ...prev,
          block: Date.now() + move.cooldown,
        }));
      }
      addLog(`${attacker.name} takes a defensive stance!`, 'neutral');
      setTimeout(() => {
        if (isPlayer1) setP1Blocking(false);
        else setP2Blocking(false);
        setTurn(isPlayer1 ? 'p2' : 'p1');
      }, 600);
      return;
    }

    // Calculate damage
    const defenderIsBlocking = isPlayer1 ? p2Blocking : p1Blocking;
    const damage = calculateDamage(attacker, move, defender, defenderIsBlocking);

    // Set attacking animation
    if (isPlayer1) {
      setP1Attacking(true);
      setTimeout(() => setP1Attacking(false), 300);
    } else {
      setP2Attacking(true);
      setTimeout(() => setP2Attacking(false), 300);
    }

    // Apply damage
    const newHealth = isPlayer1
      ? Math.max(0, p2Health - damage)
      : Math.max(0, p1Health - damage);

    if (isPlayer1) {
      setP2Health(newHealth);
    } else {
      setP1Health(newHealth);
    }

    // Set cooldown
    const newCooldowns = {
      ...cooldowns,
      [moveKey]: Date.now() + move.cooldown,
    };

    if (isPlayer1) {
      setP1Cooldowns(newCooldowns);
    } else {
      setP2Cooldowns(newCooldowns);
    }

    // Add log
    if (defenderIsBlocking) {
      addLog(
        `${attacker.name} ${move.name}s! ${defender.name} blocks for ${damage} damage!`,
        'block'
      );
    } else {
      addLog(
        `${attacker.name} ${move.name}s for ${damage} damage!`,
        'damage'
      );
    }

    // Check for winner
    if (newHealth <= 0) {
      setWinner(isPlayer1 ? player1.name : player2.name);
      setGameState('gameOver');
      addLog(
        `${isPlayer1 ? player1.name : player2.name} is victorious!`,
        'victory'
      );
      return;
    }

    // Switch turn
    setTimeout(() => {
      setTurn(isPlayer1 ? 'p2' : 'p1');
    }, 800);
  };

  // Reset game
  const resetGame = () => {
    setGameState('characterSelect');
    setPlayer1(null);
    setPlayer2(null);
    setP1Health(MAX_HEALTH);
    setP2Health(MAX_HEALTH);
    setCombatLogs([]);
    setWinner(null);
    setTurn('p1');
    setP1Cooldowns({});
    setP2Cooldowns({});
  };

  // Render character selection
  if (gameState === 'characterSelect') {
    return (
      <div className="game-container">
        <div className="character-select">
          <h1>🥋 Fighting Game 🥋</h1>
          <p>Select your character!</p>

          <div className="character-grid">
            {Object.entries(CHARACTERS).map(([key, char]) => (
              <motion.div
                key={key}
                className="character-card"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const other = Object.keys(CHARACTERS).find(
                    (k) => k !== key
                  );
                  selectCharacters(key, other);
                }}
              >
                <div className="card-emoji">🥋</div>
                <div className="card-name">{char.name}</div>
                <div className="card-stats">
                  <div>ATK: {char.baseAttack}</div>
                  <div>SPD: {char.speed}</div>
                  <div>DEF: {char.defense}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render fighting screen
  if (gameState === 'fighting' && player1 && player2) {
    return (
      <div className="game-container fighting">
        <div className="arena">
          <HealthBar
            health={p1Health}
            maxHealth={MAX_HEALTH}
            playerName={player1.name}
            isPlayer1
          />

          <div className="fight-area">
            <PlayerCharacter
              character={player1}
              isPlayer1
              isAttacking={p1Attacking}
              isBlocking={p1Blocking}
            />

            <div className="vs-text">VS</div>

            <PlayerCharacter
              character={player2}
              isPlayer1={false}
              isAttacking={p2Attacking}
              isBlocking={p2Blocking}
            />
          </div>

          <HealthBar
            health={p2Health}
            maxHealth={MAX_HEALTH}
            playerName={player2.name}
            isPlayer1={false}
          />
        </div>

        <CombatLog logs={combatLogs} />

        <div className="controls">
          <div className={`player-controls p1 ${turn === 'p1' ? 'active' : ''}`}>
            <h3>Player 1</h3>
            <div className="moves-grid">
              {Object.entries(MOVES).map(([key, move]) => (
                <motion.button
                  key={key}
                  className={`move-button ${
                    isOnCooldown(key, p1Cooldowns) ? 'cooldown' : ''
                  }`}
                  onClick={() => handleMove(key, true)}
                  disabled={
                    isOnCooldown(key, p1Cooldowns) || turn !== 'p1'
                  }
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {move.name}
                </motion.button>
              ))}
            </div>
          </div>

          <div className={`player-controls p2 ${turn === 'p2' ? 'active' : ''}`}>
            <h3>Player 2</h3>
            <div className="moves-grid">
              {Object.entries(MOVES).map(([key, move]) => (
                <motion.button
                  key={key}
                  className={`move-button ${
                    isOnCooldown(key, p2Cooldowns) ? 'cooldown' : ''
                  }`}
                  onClick={() => handleMove(key, false)}
                  disabled={
                    isOnCooldown(key, p2Cooldowns) || turn !== 'p2'
                  }
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {move.name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render game over screen
  if (gameState === 'gameOver') {
    return (
      <div className="game-container">
        <motion.div
          className="game-over"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <div className="trophy">🏆</div>
          <h1>{winner} Wins!</h1>
          <motion.button
            className="reset-button"
            onClick={resetGame}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Again
          </motion.button>
        </motion.div>
      </div>
    );
  }
}

export default FightingGame;