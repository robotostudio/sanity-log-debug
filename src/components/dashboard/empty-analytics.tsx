import Link from "next/link";
import { DatabaseIcon } from "@/components/icons";

function AnalyticsIcon() {
  return (
    <svg
      width="36"
      height="46"
      viewBox="0 0 37.2778 47.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask
        id="analytics-mask"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="38"
        height="48"
      >
        <path
          d="M0.75 46.75V31.4167M18.6388 46.75V0.75M36.5278 46.75V16.0833"
          stroke="black"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </mask>
      <g mask="url(#analytics-mask)">
        <path
          d="M45.042 -43.3333L-7.76416 9.47278M45.042 -40.2041L-7.76416 12.602M45.042 -37.0748L-7.76416 15.7313M45.042 -33.9456L-7.76416 18.8605M45.042 -30.8163L-7.76416 21.9898M45.042 -27.6871L-7.76416 25.119M45.042 -24.5578L-7.76416 28.2483M45.042 -21.4286L-7.76416 31.3775M45.042 -18.2993L-7.76416 34.5068M45.042 -15.1701L-7.76416 37.636M45.042 -12.0408L-7.76416 40.7653M45.042 -8.91158L-7.76416 43.8945M45.042 -5.78233L-7.76416 47.0238M45.042 -2.65307L-7.76416 50.1531M45.042 0.476177L-7.76416 53.2823M45.042 3.60543L-7.76416 56.4116M45.042 6.73468L-7.76416 59.5408M45.042 9.86393L-7.76416 62.67M45.042 12.9932L-7.76416 65.7993M45.042 16.1224L-7.76416 68.9286M45.042 19.2517L-7.76416 72.0578M45.042 22.3809L-7.76416 75.1871M45.042 25.5102L-7.76416 78.3163M45.042 28.6394L-7.76416 81.4456M45.042 31.7687L-7.76416 84.5748M45.042 34.8979L-7.76416 87.7041M45.042 38.0272L-7.76416 90.8333"
          stroke="url(#analytics-linear)"
          strokeWidth="0.291667"
        />
      </g>
      <path
        d="M0.75 46.75V31.4167M18.6388 46.75V0.75M36.5278 46.75V16.0833"
        stroke="#525252"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.75 46.75V31.4167M18.6388 46.75V0.75M36.5278 46.75V16.0833"
        stroke="url(#analytics-radial)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="analytics-linear"
          x1="-1.3475"
          y1="3.33332"
          x2="34.2358"
          y2="45.3333"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A3A3A3" />
          <stop offset="1" stopColor="#A3A3A3" stopOpacity="0" />
        </linearGradient>
        <radialGradient
          id="analytics-radial"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0.75 0.75) rotate(52.125) scale(58.2756 45.3254)"
        >
          <stop stopColor="#B0B0B0" />
          <stop offset="1" stopColor="#141414" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function EmptyAnalytics() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center -mt-24">
      <div className="flex w-80 flex-col items-start gap-6 self-center">
        <div className="flex flex-col items-start gap-6 w-full">
          {/* Icon container with radial gradient */}
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-800 bg-[radial-gradient(circle,#222_0%,#141414_100%)]">
            <AnalyticsIcon />
          </div>

          <div className="flex flex-col items-start gap-4 w-full">
            <h2 className="text-2xl font-semibold leading-9 text-[#fafafa]">
              Select a data source
            </h2>

            <p className="text-lg leading-7 text-[#a1a1aa]">
              View analytics and explore your Sanity API logs.
            </p>
          </div>
        </div>

        <Link
          href="/sources"
          className="inline-flex items-center gap-2 rounded-lg bg-[#f4f4f5] px-4 py-2 text-lg font-medium leading-7 text-[#09090b] transition-colors hover:bg-zinc-200"
        >
          <DatabaseIcon className="h-5 w-5" />
          Browse sources
        </Link>
      </div>
    </div>
  );
}
