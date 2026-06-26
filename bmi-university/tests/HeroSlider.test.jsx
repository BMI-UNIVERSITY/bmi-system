import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HeroSlider from '../components/HeroSlider';

describe('HeroSlider Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockProps = {
    images: ['/img1.jpg', '/img2.jpg', '/img3.jpg'],
    title: 'Welcome to BMI',
    subtitle: 'Building Leaders',
    primaryAction: { label: 'Apply', href: '/apply' },
    secondaryAction: { label: 'Learn More', href: '/about' },
  };

  it('renders correctly with initial props', () => {
    render(<HeroSlider {...mockProps} />);
    
    expect(screen.getByText('Welcome to BMI')).toBeInTheDocument();
    expect(screen.getByText('Building Leaders')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apply' })).toHaveAttribute('href', '/apply');
    expect(screen.getByRole('link', { name: 'Learn More' })).toHaveAttribute('href', '/about');
  });

  it('rotates through images on an interval', () => {
    const { container } = render(<HeroSlider {...mockProps} />);
    
    // By checking the styles or class names, we can verify the rotation.
    // The component maps the images and uses opacity-100 for the current slide, opacity-0 for others.
    const getVisibleSlideIndex = () => {
      const slides = Array.from(container.querySelectorAll('.bg-cover'));
      return slides.findIndex(slide => slide.className.includes('opacity-100'));
    };

    // Initially, slide 0 should be visible
    expect(getVisibleSlideIndex()).toBe(0);

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getVisibleSlideIndex()).toBe(1);

    // Fast-forward another 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getVisibleSlideIndex()).toBe(2);

    // Fast-forward another 5 seconds (wraps around)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getVisibleSlideIndex()).toBe(0);
  });
  
  it('does not set up interval if only one image is provided', () => {
    const { container } = render(<HeroSlider {...mockProps} images={['/img1.jpg']} />);
    
    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    // No error should be thrown and it should just stay on index 0
    const slides = Array.from(container.querySelectorAll('.bg-cover'));
    expect(slides.length).toBe(1);
    expect(slides[0].className).toContain('opacity-100');
  });
});
