/** Data adapters are application-specific; call Rebuild() after updating the data. */
export interface FlexalonDataSource<T=unknown> { getCount():number; getItem(index:number):T; }
