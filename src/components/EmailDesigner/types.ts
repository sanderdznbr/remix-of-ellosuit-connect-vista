
export interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'container' | 'header' | 'footer' | 'grid' | 'quote' | 'rating' | 'testimonial' | 'address' | 'phone' | 'email' | 'calendar';
  content?: string;
  children?: DesignElement[];
  styles: {
    [key: string]: any;
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
  locked?: boolean;
  visible?: boolean;
  name?: string;
}
