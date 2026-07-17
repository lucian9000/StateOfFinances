"use client";

const DIGITS = "0123456789".split("");

function OdometerDigit({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-top">
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="h-[1em] leading-[1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Renders a pre-formatted numeric string (e.g. "26,129" or "2,800.50") with
 * each digit rolling like an odometer when the value changes. Non-digit
 * characters (commas, periods, minus signs) render statically.
 */
export function OdometerNumber({ text }: { text: string }) {
  return (
    <span className="tabular font-mono tracking-tight">
      {text.split("").map((char, i) => {
        if (/[0-9]/.test(char)) {
          return <OdometerDigit key={i} digit={parseInt(char, 10)} />;
        }
        return (
          <span key={i} className="inline-block">
            {char}
          </span>
        );
      })}
    </span>
  );
}
