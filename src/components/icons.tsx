import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function LogoIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20.25 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#logo-clip)">
        <path
          d="M0.0136356 7.2V14.4H3.62474V3.6L0.0136356 7.2Z"
          fill="currentColor"
        />
        <path
          d="M3.62474 18H13.0136L16.6247 14.4H3.62474V18Z"
          fill="currentColor"
        />
        <path
          d="M16.6247 0L7.23586 0L3.62474 3.6H16.6247V0Z"
          fill="currentColor"
        />
        <path
          d="M16.6247 3.6V14.4L20.2359 10.8V3.6H16.6247Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="logo-clip">
          <rect width="20.25" height="18" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function SidebarCloseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 2.5V17.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.33333 12.5L5.83333 10L8.33333 7.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SidebarOpenIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 2.5V17.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6667 7.5L14.1667 10L11.6667 12.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15.75 15.75L12.495 12.495"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommandKeyIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.5 3V9C7.5 9.29667 7.58797 9.58668 7.7528 9.83336C7.91762 10.08 8.15189 10.2723 8.42598 10.3858C8.70006 10.4994 9.00166 10.5291 9.29264 10.4712C9.58361 10.4133 9.85088 10.2704 10.0607 10.0607C10.2704 9.85088 10.4133 9.58361 10.4712 9.29264C10.5291 9.00166 10.4994 8.70006 10.3858 8.42598C10.2723 8.15189 10.08 7.91762 9.83336 7.7528C9.58668 7.58797 9.29667 7.5 9 7.5H3C2.70333 7.5 2.41332 7.58797 2.16665 7.7528C1.91997 7.91762 1.72771 8.15189 1.61418 8.42598C1.50065 8.70006 1.47094 9.00166 1.52882 9.29264C1.5867 9.58361 1.72956 9.85088 1.93934 10.0607C2.14912 10.2704 2.41639 10.4133 2.70737 10.4712C2.99834 10.5291 3.29994 10.4994 3.57403 10.3858C3.84812 10.2723 4.08238 10.08 4.24721 9.83336C4.41203 9.58668 4.5 9.29667 4.5 9V3C4.5 2.70333 4.41203 2.41332 4.24721 2.16665C4.08238 1.91997 3.84812 1.72771 3.57403 1.61418C3.29994 1.50065 2.99834 1.47094 2.70737 1.52882C2.41639 1.5867 2.14912 1.72956 1.93934 1.93934C1.72956 2.14912 1.5867 2.41639 1.52882 2.70737C1.47094 2.99834 1.50065 3.29994 1.61418 3.57403C1.72771 3.84812 1.91997 4.08238 2.16665 4.24721C2.41332 4.41203 2.70333 4.5 3 4.5H9C9.29667 4.5 9.58668 4.41203 9.83336 4.24721C10.08 4.08238 10.2723 3.84812 10.3858 3.57403C10.4994 3.29994 10.5291 2.99834 10.4712 2.70737C10.4133 2.41639 10.2704 2.14912 10.0607 1.93934C9.85088 1.72956 9.58361 1.5867 9.29264 1.52882C9.00166 1.47094 8.70006 1.50065 8.42598 1.61418C8.15189 1.72771 7.91762 1.91997 7.7528 2.16665C7.58797 2.41332 7.5 2.70333 7.5 3Z"
        stroke="currentColor"
        strokeWidth="0.857143"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnalyticsNavIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3.75 15.75V11.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 15.75V2.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.25 15.75V6.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SourcesNavIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 6C12.7279 6 15.75 4.99264 15.75 3.75C15.75 2.50736 12.7279 1.5 9 1.5C5.27208 1.5 2.25 2.50736 2.25 3.75C2.25 4.99264 5.27208 6 9 6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 3.75V14.25C2.25 14.8467 2.96116 15.419 4.22703 15.841C5.4929 16.2629 7.20979 16.5 9 16.5C10.7902 16.5 12.5071 16.2629 13.773 15.841C15.0388 15.419 15.75 14.8467 15.75 14.25V3.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 9C2.25 9.59674 2.96116 10.169 4.22703 10.591C5.4929 11.0129 7.20979 11.25 9 11.25C10.7902 11.25 12.5071 11.0129 13.773 10.591C15.0388 10.169 15.75 9.59674 15.75 9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PipelineNavIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.75 2.25H3.75C2.92157 2.25 2.25 2.92157 2.25 3.75V6.75C2.25 7.57843 2.92157 8.25 3.75 8.25H6.75C7.57843 8.25 8.25 7.57843 8.25 6.75V3.75C8.25 2.92157 7.57843 2.25 6.75 2.25Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 8.25V11.25C5.25 11.6478 5.40804 12.0294 5.68934 12.3107C5.97064 12.592 6.35218 12.75 6.75 12.75H9.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.25 9.75H11.25C10.4216 9.75 9.75 10.4216 9.75 11.25V14.25C9.75 15.0784 10.4216 15.75 11.25 15.75H14.25C15.0784 15.75 15.75 15.0784 15.75 14.25V11.25C15.75 10.4216 15.0784 9.75 14.25 9.75Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.165 1.5H8.835C8.43718 1.5 8.05565 1.65804 7.77434 1.93934C7.49304 2.22064 7.335 2.60218 7.335 3V3.135C7.33473 3.39804 7.26529 3.65639 7.13366 3.88413C7.00202 4.11186 6.8128 4.30098 6.585 4.4325L6.2625 4.62C6.03447 4.75165 5.77581 4.82096 5.5125 4.82096C5.2492 4.82096 4.99053 4.75165 4.7625 4.62L4.65 4.56C4.3058 4.36145 3.89688 4.30758 3.513 4.41023C3.12913 4.51288 2.80166 4.76365 2.6025 5.1075L2.4375 5.3925C2.23895 5.7367 2.18508 6.14562 2.28773 6.5295C2.39038 6.91338 2.64115 7.24084 2.985 7.44L3.0975 7.515C3.32421 7.64588 3.51272 7.83382 3.64429 8.06012C3.77586 8.28643 3.84592 8.54323 3.8475 8.805V9.1875C3.84855 9.45182 3.77974 9.71171 3.64803 9.94088C3.51633 10.17 3.32641 10.3603 3.0975 10.4925L2.985 10.56C2.64115 10.7592 2.39038 11.0866 2.28773 11.4705C2.18508 11.8544 2.23895 12.2633 2.4375 12.6075L2.6025 12.8925C2.80166 13.2363 3.12913 13.4871 3.513 13.5898C3.89688 13.6924 4.3058 13.6386 4.65 13.44L4.7625 13.38C4.99053 13.2483 5.2492 13.179 5.5125 13.179C5.77581 13.179 6.03447 13.2483 6.2625 13.38L6.585 13.5675C6.8128 13.699 7.00202 13.8881 7.13366 14.1159C7.26529 14.3436 7.33473 14.602 7.335 14.865V15C7.335 15.3978 7.49304 15.7794 7.77434 16.0607C8.05565 16.342 8.43718 16.5 8.835 16.5H9.165C9.56283 16.5 9.94436 16.342 10.2257 16.0607C10.507 15.7794 10.665 15.3978 10.665 15V14.865C10.6653 14.602 10.7347 14.3436 10.8663 14.1159C10.998 13.8881 11.1872 13.699 11.415 13.5675L11.7375 13.38C11.9655 13.2483 12.2242 13.179 12.4875 13.179C12.7508 13.179 13.0095 13.2483 13.2375 13.38L13.35 13.44C13.6942 13.6386 14.1031 13.6924 14.487 13.5898C14.8709 13.4871 15.1983 13.2363 15.3975 12.8925L15.5625 12.6C15.7611 12.2558 15.8149 11.8469 15.7123 11.463C15.6096 11.0791 15.3588 10.7517 15.015 10.5525L14.9025 10.4925C14.6736 10.3603 14.4837 10.17 14.352 9.94088C14.2203 9.71171 14.1515 9.45182 14.1525 9.1875V8.8125C14.1515 8.54818 14.2203 8.28829 14.352 8.05912C14.4837 7.82995 14.6736 7.63966 14.9025 7.5075L15.015 7.44C15.3588 7.24084 15.6096 6.91338 15.7123 6.5295C15.8149 6.14562 15.7611 5.7367 15.5625 5.3925L15.3975 5.1075C15.1983 4.76365 14.8709 4.51288 14.487 4.41023C14.1031 4.30758 13.6942 4.36145 13.35 4.56L13.2375 4.62C13.0095 4.75165 12.7508 4.82096 12.4875 4.82096C12.2242 4.82096 11.9655 4.75165 11.7375 4.62L11.415 4.4325C11.1872 4.30098 10.998 4.11186 10.8663 3.88413C10.7347 3.65639 10.6653 3.39804 10.665 3.135V3C10.665 2.60218 10.507 2.22064 10.2257 1.93934C9.94436 1.65804 9.56283 1.5 9.165 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.5 6.75L9 11.25L13.5 6.75"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 5.99998C12.7279 5.99998 15.75 4.99262 15.75 3.74998C15.75 2.50734 12.7279 1.49998 9 1.49998C5.27208 1.49998 2.25 2.50734 2.25 3.74998C2.25 4.99262 5.27208 5.99998 9 5.99998Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 3.74998V14.25C2.25 14.8467 2.96116 15.419 4.22703 15.841C5.4929 16.2629 7.20979 16.5 9 16.5C10.7902 16.5 12.5071 16.2629 13.773 15.841C15.0388 15.419 15.75 14.8467 15.75 14.25V3.74998"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 9C2.25 9.59674 2.96116 10.169 4.22703 10.591C5.4929 11.0129 7.20979 11.25 9 11.25C10.7902 11.25 12.5071 11.0129 13.773 10.591C15.0388 10.169 15.75 9.59674 15.75 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminNavIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 1.5L2.25 4.5V8.25C2.25 12.4125 5.13 16.3275 9 17.25C12.87 16.3275 15.75 12.4125 15.75 8.25V4.5L9 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.25V10.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="9" cy="6.75" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function DatabaseIconSm(props: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 5.33333C11.3137 5.33333 14 4.4379 14 3.33333C14 2.22876 11.3137 1.33333 8 1.33333C4.68629 1.33333 2 2.22876 2 3.33333C2 4.4379 4.68629 5.33333 8 5.33333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 3.33333V12.6667C2 13.1971 2.63214 13.7058 3.75736 14.0809C4.88258 14.456 6.4087 14.6667 8 14.6667C9.5913 14.6667 11.1174 14.456 12.2426 14.0809C13.3679 13.7058 14 13.1971 14 12.6667V3.33333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 8C2 8.53043 2.63214 9.03914 3.75736 9.41421C4.88258 9.78929 6.4087 10 8 10C9.5913 10 11.1174 9.78929 12.2426 9.41421C13.3679 9.03914 14 8.53043 14 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
