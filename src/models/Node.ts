import { Flow } from './Flow';

export interface Node {
    id: string;
    idClean: string;
    in: Flow[];
    out: Flow[];
    width: number;
    column?: number;
    x: number;
    x_: number;
    y: number;
    y_: number;
    sorting?: number;
    paddings?: number;
    size?: number;
    size_: number;
    style?: Record<string, string>;
    className?: string;
    label: {
        text: null | string | ((node: Node) => string);
        position?: 'left' | 'right' | 'center';
        width: number;
        height: number;
    };
    tooltip?: string | ((node: Node) => string);
    relativeTo?: {
        id: string;
        y1?: number;
        y2?: number;
    };
}
