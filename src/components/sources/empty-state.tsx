"use client";

import { DatabaseIconSm } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Upload } from "@/components/upload";

function SourcesIcon() {
  return (
    <svg
      width="43"
      height="48"
      viewBox="0 0 42.9 47.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask
        id="sources-mask"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="43"
        height="48"
      >
        <path
          d="M42.15 7.65C42.15 11.4608 32.8823 14.55 21.45 14.55C10.0177 14.55 0.75 11.4608 0.75 7.65M42.15 7.65C42.15 3.83924 32.8823 0.75 21.45 0.75C10.0177 0.75 0.75 3.83924 0.75 7.65M42.15 7.65V39.85C42.15 41.68 39.9691 43.435 36.0871 44.729C32.2051 46.023 26.94 46.75 21.45 46.75C15.96 46.75 10.6949 46.023 6.81289 44.729C2.93089 43.435 0.75 41.68 0.75 39.85V7.65"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <g mask="url(#sources-mask)">
        <path
          d="M47.853 -40.3333L-4.95312 12.4728M47.853 -37.2041L-4.95312 15.602M47.853 -34.0748L-4.95312 18.7313M47.853 -30.9456L-4.95312 21.8605M47.853 -27.8163L-4.95312 24.9898M47.853 -24.6871L-4.95312 28.119M47.853 -21.5578L-4.95312 31.2483M47.853 -18.4286L-4.95312 34.3775M47.853 -15.2993L-4.95312 37.5068M47.853 -12.1701L-4.95312 40.636M47.853 -9.04083L-4.95312 43.7653M47.853 -5.91158L-4.95312 46.8945M47.853 -2.78233L-4.95312 50.0238M47.853 0.346928L-4.95312 53.1531M47.853 3.47618L-4.95312 56.2823M47.853 6.60543L-4.95312 59.4116M47.853 9.73468L-4.95312 62.5408M47.853 12.8639L-4.95312 65.6701M47.853 15.9932L-4.95312 68.7993M47.853 19.1224L-4.95312 71.9286M47.853 22.2517L-4.95312 75.0578M47.853 25.3809L-4.95312 78.1871M47.853 28.5102L-4.95312 81.3163M47.853 31.6395L-4.95312 84.4456M47.853 34.7687L-4.95312 87.5748M47.853 37.8979L-4.95312 90.7041M47.853 41.0272L-4.95312 93.8333"
          stroke="url(#sources-linear)"
          strokeWidth="0.291667"
        />
      </g>
      <path
        d="M42.15 7.65C42.15 11.4608 32.8823 14.55 21.45 14.55C10.0177 14.55 0.75 11.4608 0.75 7.65M42.15 7.65C42.15 3.83924 32.8823 0.75 21.45 0.75C10.0177 0.75 0.75 3.83924 0.75 7.65M42.15 7.65V39.85C42.15 41.68 39.9691 43.435 36.0871 44.729C32.2051 46.023 26.94 46.75 21.45 46.75C15.96 46.75 10.6949 46.023 6.81289 44.729C2.93089 43.435 0.75 41.68 0.75 39.85V7.65"
        stroke="#525252"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42.15 7.65C42.15 11.4608 32.8823 14.55 21.45 14.55C10.0177 14.55 0.75 11.4608 0.75 7.65M42.15 7.65C42.15 3.83924 32.8823 0.75 21.45 0.75C10.0177 0.75 0.75 3.83924 0.75 7.65M42.15 7.65V39.85C42.15 41.68 39.9691 43.435 36.0871 44.729C32.2051 46.023 26.94 46.75 21.45 46.75C15.96 46.75 10.6949 46.023 6.81289 44.729C2.93089 43.435 0.75 41.68 0.75 39.85V7.65"
        stroke="url(#sources-radial)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="sources-linear"
          x1="1.46354"
          y1="6.33332"
          x2="37.0469"
          y2="48.3333"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A3A3A3" />
          <stop offset="1" stopColor="#A3A3A3" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id="sources-radial"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0.75 0.75) rotate(48.8702) scale(62.9402 56.6462)"
        >
          <stop stopColor="#B0B0B0" />
          <stop offset="1" stopColor="#141414" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function EmptyState() {
  return (
    <div className="-mt-24 flex flex-1 flex-col items-start justify-center">
      <div className="flex w-80 flex-col items-start gap-6 self-center">
        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-800 bg-[radial-gradient(circle,#222_0%,#141414_100%)]">
            <SourcesIcon />
          </div>

          <div className="flex w-full flex-col items-start gap-4">
            <h2 className="text-2xl font-semibold leading-9 text-[#fafafa]">
              No data sources yet
            </h2>

            <p className="text-lg leading-7 text-[#a1a1aa]">
              Upload your first{" "}
              <span className="text-[#f4f4f5]">.csv (up to 5 GB)</span> file to
              start exploring your data. We&apos;ll parse and validate it
              automatically.
            </p>
          </div>
        </div>

        <Upload.Trigger>
          <Button
            variant="surface"
            className="rounded-lg px-4 py-2 text-lg leading-7"
          >
            <DatabaseIconSm className="h-5 w-5" />
            Upload sources
          </Button>
        </Upload.Trigger>
      </div>
    </div>
  );
}
