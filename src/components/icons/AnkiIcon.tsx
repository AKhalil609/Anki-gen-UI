export default function AnkiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={props.width ?? 24}
      height={props.height ?? 24}
      {...props}
    >
      {/* Filled card box */}
      <rect x="8" y="10" width="32" height="28" rx="4" fill="currentColor" stroke="none" />

      {/* Star stays outlined so it “pops” */}
      <path
        d="M24 14
           l3 6 7 .9 
           -5 4.9 1.2 6.9 
           -6.2-3.3 -6.2 3.3 
           1.2-6.9 -5-4.9 
           7-.9z"
        fill="white"
        stroke="black"
      />
    </svg>
  );
}
