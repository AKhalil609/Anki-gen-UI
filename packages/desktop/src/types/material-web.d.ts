import "react";

declare module "react" {
  namespace JSX {
    type MDProps =
      React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
      Record<string, any>; // allow custom attributes like label, value, supportingText, etc.

    interface IntrinsicElements {
      [elemName: `md-${string}`]: MDProps;
    }
  }
}