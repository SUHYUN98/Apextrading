interface SliderBounds {
  min: number;
  max: number;
  step: number;
}

const TRACK = 'absolute inset-x-0 h-1.5 rounded-full bg-neutral-800';

const THUMB_INPUT =
  'absolute inset-0 w-full h-full appearance-none bg-transparent outline-none ' +
  '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto ' +
  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-400 ' +
  '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab ' +
  '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-sky-400 [&::-moz-range-thumb]:cursor-grab';

function toPercent(value: number, { min, max }: SliderBounds): number {
  return ((value - min) / (max - min)) * 100;
}

interface RangeSliderProps extends SliderBounds {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function RangeSlider({ label, value, onChange, ...bounds }: RangeSliderProps) {
  return (
    <div className="relative h-5 flex items-center">
      <div className={TRACK} />
      <div
        className="absolute left-0 h-1.5 rounded-full bg-sky-500"
        style={{ width: `${toPercent(value, bounds)}%` }}
      />
      <input
        type="range"
        aria-label={label}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={THUMB_INPUT}
      />
    </div>
  );
}

interface DualRangeSliderProps extends SliderBounds {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function DualRangeSlider({ label, lowLabel, highLabel, value, onChange, ...bounds }: DualRangeSliderProps) {
  const [low, high] = value;
  const lowOnTop = low >= bounds.max - bounds.step * 2;

  return (
    <div className="relative h-5 flex items-center">
      <div className={TRACK} />
      <div
        className="absolute h-1.5 rounded-full bg-sky-500"
        style={{ left: `${toPercent(low, bounds)}%`, right: `${100 - toPercent(high, bounds)}%` }}
      />
      <input
        type="range"
        aria-label={`${label} - ${lowLabel}`}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={low}
        onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
        className={`${THUMB_INPUT} pointer-events-none`}
        style={{ zIndex: lowOnTop ? 4 : 3 }}
      />
      <input
        type="range"
        aria-label={`${label} - ${highLabel}`}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={high}
        onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
        className={`${THUMB_INPUT} pointer-events-none`}
        style={{ zIndex: lowOnTop ? 3 : 4 }}
      />
    </div>
  );
}
