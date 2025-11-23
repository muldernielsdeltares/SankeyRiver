export interface Flow {
    from: string
    to: string
    idClean: string
    value: number
    style?: Record<string, string>
    className?: string
    tooltip?: string
    yOffsetFrom: number
    yOffsetTo: number
    render: string // 'b' for bezier | 'th' for Tiller Hanson
}
