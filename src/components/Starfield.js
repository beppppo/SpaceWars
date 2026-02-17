import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

const Star = ({ x, y, size, opacity, speed }) => {
  return (
    <View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: opacity,
        },
      ]}
    />
  );
};

export default function Starfield({ scrollSpeed = 1 }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stars, setStars] = useState([]);
  const animationFrameRef = useRef(null);
  
  // Initialize stars
  useEffect(() => {
    const initialStars = [];
    const numStars = 150; // More stars for a dense starfield
    
    for (let i = 0; i < numStars; i++) {
      initialStars.push({
        id: i,
        x: Math.random() * screenWidth,
        y: Math.random() * screenHeight,
        size: Math.random() * 2 + 0.5, // 0.5 to 2.5 pixels
        opacity: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
        speed: Math.random() * scrollSpeed * 0.5 + scrollSpeed * 0.5, // Varying speeds for depth
      });
    }
    
    setStars(initialStars);
  }, [screenWidth, screenHeight, scrollSpeed]);
  
  // Animate stars scrolling downward
  useEffect(() => {
    const animate = () => {
      setStars((prevStars) => {
        return prevStars.map((star) => {
          let newY = star.y + star.speed;
          
          // Reset star to top when it goes off screen
          if (newY > screenHeight) {
            return {
              ...star,
              x: Math.random() * screenWidth,
              y: -10,
            };
          }
          
          return {
            ...star,
            y: newY,
          };
        });
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [screenHeight]);
  
  return (
    <View style={styles.starfield} pointerEvents="none">
      {stars.map((star) => (
        <Star
          key={star.id}
          x={star.x}
          y={star.y}
          size={star.size}
          opacity={star.opacity}
          speed={star.speed}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  starfield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
});

