// frontend/src/types.ts
// central place to share shape definitions between api.ts and App.tsx

export interface CatNode {
    label: string;
    url: string;
    children?: CatNode[];
  }
  
  export interface FacetValue {
    label: string;
    qs: string;               // e.g. "size=L"
  }
  
  export interface FacetGroup {
    name: string;             // e.g. "Size"
    multi: boolean;           // true = checkbox list ; false = radio list
    values: FacetValue[];
  }
  