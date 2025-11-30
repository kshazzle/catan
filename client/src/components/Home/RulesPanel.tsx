import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './RulesPanel.css';

export function RulesPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  const rules = [
    {
      icon: '👥',
      title: 'Players',
      description: '2 to 4 players compete to dominate the island by collecting resources and building structures.'
    },
    {
      icon: '🎯',
      title: 'Goal',
      description: 'Be the first to reach 10 victory points by constructing settlements, cities, and claiming achievements.'
    },
    {
      icon: '🏁',
      title: 'Setup',
      description: 'Players take turns placing 2 settlements and 2 roads. First round goes in order, second round in reverse. Your second settlement grants starting resources!'
    },
    {
      icon: '🎲',
      title: 'Turn Flow',
      description: 'On your turn: roll dice → collect resources from matching tiles → trade with others or the bank → build or buy dev cards → end turn.'
    },
    {
      icon: '🏠',
      title: 'Building',
      description: 'Roads (wood+brick), Settlements (wood+brick+sheep+wheat), Cities (2 wheat + 3 ore). Max: 15 roads, 5 settlements, 4 cities.'
    },
    {
      icon: '💰',
      title: 'Resources',
      description: 'When dice are rolled, tiles with that number produce resources for adjacent settlements (1 card) and cities (2 cards).'
    },
    {
      icon: '⚓',
      title: 'Harbors',
      description: 'Build on harbor vertices for better bank trades: 3:1 generic harbors or 2:1 for specific resources (wood, brick, sheep, wheat, ore).'
    },
    {
      icon: '🦹',
      title: 'The Robber',
      description: 'Rolling a 7 activates the robber: players with 8+ cards discard half, then move the robber to block a tile and steal from an opponent.'
    },
    {
      icon: '🃏',
      title: 'Development Cards',
      description: 'Buy for sheep+wheat+ore. Knights move the robber, Road Building = 2 free roads, Year of Plenty = 2 free resources, Monopoly steals all of one resource.'
    },
    {
      icon: '🔄',
      title: 'Trading',
      description: 'Trade with the bank at 4:1 ratio (or better with harbors), or negotiate player-to-player trades during your turn.'
    },
    {
      icon: '🏆',
      title: 'Victory Points',
      description: 'Settlements = 1 VP, Cities = 2 VP, Longest Road (5+ roads) = 2 VP, Largest Army (3+ knights) = 2 VP, VP dev cards = 1 VP each.'
    }
  ];

  return (
    <div className="rules-panel glass-card-sm">
      <button 
        className="rules-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="rules-title">
          <span className="rules-icon">📜</span>
          How to Play
        </span>
        <motion.span 
          className="rules-toggle"
          animate={{ rotate: isExpanded ? 180 : 0 }}
        >
          ▼
        </motion.span>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="rules-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rules-grid">
              {rules.map((rule, index) => (
                <motion.div
                  key={rule.title}
                  className="rule-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="rule-icon">{rule.icon}</span>
                  <div className="rule-text">
                    <h4>{rule.title}</h4>
                    <p>{rule.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

