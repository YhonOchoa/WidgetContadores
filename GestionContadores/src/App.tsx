import React from 'react';

const FilterContext = React.createContext<Filters | null>(null);

interface modulRecord {
    id: string;
    Name?: string;
    Estado?: string;
    idFecha?: string;
    label?: string;
    numeroMedidor?: string;
    criteriaField?: string;
    Comprador_principal?: { id: string, name: string };
    Product_Name?: string;
    Propietario?: { id: string, name: string };
    lecturaMedidor?: number;
    Lectura_medidor_de_agua?: string;
    Lectura_medidor_de_energ_a?: string;
    Lectura_medidor_de_gas?: string;
    N_mero_medidor_de_Agua?: string;
    N_mero_medidor_de_Gas?: string;
    N_mero_medidor_de_Energ_a?: string;
    Inmueble?: { id: string, name: string };
    [key: string]: string | number | object | undefined;
}

interface Filters {
    proyecto: modulRecord,
    agrupacion: modulRecord,
    tipoContador: modulRecord
}

interface responseGetRecords {
    "$responseHeaders"?: {
        "x-ratelimit-remaining": null,
        "x-ratelimit-limit": null,
        "x-ratelimit-reset": null
    },
    data?: modulRecord[],
    info?: {
        "per_page": number,
        "count": number,
        "page": number,
        "sort_by": string,
        "sort_order": string,
        "more_records": boolean
    },
    code?: string,
    details?: {
        "param_name": string
    },
    message?: string,
    status?: string
}
export default function App() {
    const [filters, setFilters] = React.useState<Filters>({} as Filters);
    const [entregas, setEntregas] = React.useState<modulRecord[]>([]);
    const [updateEntregas, setUpdateEntregas] = React.useState<modulRecord[]>([]);

    React.useEffect(() => {
        // ZOHO.embeddedApp.on("PageLoad", () => console.log('Init instance zoho'));
        ZOHO.embeddedApp.init();
    }, []);

    React.useEffect(() => {
        if (filters.proyecto?.id && filters.agrupacion?.id && filters.tipoContador?.id) {
            fetchDataAll();
        } else {
            setEntregas([]);
            setUpdateEntregas([]);
        }
    }, [filters]);


    const fetchDataAll = () => {
        const { proyecto } = filters;
        ZOHO.CRM.API.getRelatedRecords({
            Entity: "Proyectos_Inmobiliarios",
            RecordID: proyecto.id,
            RelatedList: "Inmuebles",
            page: 1, per_page: 200
        }).then(function (data: responseGetRecords) {
            const Entregas = data.data?.map(async inmueble => {
                return await ZOHO.CRM.API.getRelatedRecords({
                    Entity: "Products",
                    RecordID: inmueble.id,
                    RelatedList: "Entregas",
                    page: 1, per_page: 200
                }).then(function (data: responseGetRecords) {
                    return data.data?.filter(value => ["Entregado", "Entregado con pendientes"].includes(value.Estado ?? ''));
                });
            });
            if (!Entregas) return;
            Promise.all(Entregas).then((results: modulRecord[]) => {
                setEntregas(results.flat().filter(a => !!a).filter(masterFilter));
            });
        });
    };


    const masterFilter = (row: modulRecord) => {
        if (!filters.tipoContador.criteriaField) return true;
        const validateEstaus = ['Aplica y no entregado'].includes(`${row[filters.tipoContador.criteriaField] ?? 'Sin valor'}`);
        const validateEmpty = !row[filters.tipoContador.idFecha ?? ''];
        return validateEstaus && validateEmpty;
    }

    const setDataFilters = (filter: object) => {
        setFilters(a => ({ ...a, ...filter }));
    };

    const searchProyects = (value: string, setValues: (a: modulRecord[]) => void) => {
        ZohoSearch("Proyectos_Inmobiliarios", value, info => setValues(info.data ?? []), "word");
    };

    const searchAgrupacion = (value: string, setValues: (a: modulRecord[]) => void) => {
        const valueFilter = filters.proyecto?.Name ?? "";
        if (!valueFilter) return setValues([]);
        ZohoSearch("Agrupaciones", `(Proyecto:equals:${valueFilter})`, info => setValues(info.data ?? []), "criteria");
    };

    const searchTipoContador = (value: string, setValues: (a: modulRecord[]) => void) => {
        setValues([
            {
                id: "Lectura_medidor_de_energ_a", Name: "Contador de energía",
                label: 'ENERGÍA', idFecha: "Fecha_entrega_contador_energ_a",
                criteriaField: "Contador_de_energ_a", numeroMedidor: "N_mero_medidor_de_Energ_a"
            },
            {
                id: "Lectura_medidor_de_agua", Name: "Contador de agua",
                label: 'AGUA', idFecha: "Fecha_entrega_contador_agua",
                criteriaField: "Contador_de_agua", numeroMedidor: "N_mero_medidor_de_Agua"
            },
            {
                id: "Lectura_medidor_de_gas", Name: "Contador de gas",
                label: 'GAS', idFecha: "Fecha_entrega_contador_gas",
                criteriaField: "Contador_de_gas", numeroMedidor: "N_mero_medidor_de_Gas"
            }
        ]);
    }

    const rowsSelected = (rows: modulRecord[]) => {
        setUpdateEntregas(rows);
    };

    async function ZohoSearch(module: string, query: string, setResponse: (a: responseGetRecords) => void, type: string) {
        await ZOHO.CRM.API.searchRecord({ Entity: module, Type: type ?? "word", Query: query })
            .then(setResponse).catch(err => {
                console.log(err);
                setResponse({ data: [] });
            });
    }

    const sabeEntregas = () => {
        console.log("Saving data: ", updateEntregas);
        updateEntregas.forEach(async entrega => {
            await ZOHO.CRM.API.updateRecord({
                Entity: "Entregas",
                APIData: [entrega],
                Trigger: []
            }).then(function (data: responseGetRecords) {
                console.log("Save response: ", data);
            }).catch((err: any) => console.log("Error saving record: ", err));
        });
        setUpdateEntregas([]);
        fetchDataAll();
    };

    return (
        <div className='main'>
            <div className='card'>
                <div className='title'>
                    <h1>Gestión de contadores no entregados</h1>
                </div>
                <div className='filters'>
                    <InputConSelector
                        label="Proyecto:"
                        value={filters.proyecto}
                        onChange={searchProyects}
                        setValue={a => setDataFilters({ proyecto: a, agrupacion: { id: '000', Name: '' } })}
                    />
                    <InputConSelector
                        label="Agrupación:"
                        value={filters.agrupacion}
                        onChange={searchAgrupacion}
                        setValue={a => setDataFilters({ agrupacion: a })}
                        local={true}
                    />
                    <InputConSelector
                        label="Tipo de contador a entregar:"
                        value={filters.tipoContador}
                        onChange={searchTipoContador}
                        setValue={a => setDataFilters({ tipoContador: a })}
                        local={true}
                    />
                    <button
                        className={updateEntregas.length ? 'btn_Active' : 'btn_inactive'}
                        onClick={sabeEntregas}
                    >Guardar {updateEntregas.length || ""} Entregas
                    </button>
                </div>
            </div>
            <div className='card'>
                <FilterContext.Provider value={filters}>
                    {entregas && <TablaMedidores data={entregas} rowsSelected={rowsSelected} />}
                </FilterContext.Provider>
            </div>
        </div>
    )
}

const InputConSelector = (
    { label, value, onChange, setValue, local = false }:
        {
            label: string, value: modulRecord,
            onChange: (a: string, setValues: (a: modulRecord[]) => void) => void,
            setValue: (a: modulRecord) => void,
            local?: boolean
        }) => {
    const [options, setOptions] = React.useState<modulRecord[]>([]);

    const timeoutRef = React.useRef<number | undefined>(undefined);
    const timeoutIdRef = React.useRef<number | undefined>(undefined);

    const debounce = React.useCallback((a: string) => {
        setValue({ Name: a, id: '' });
        if (!a || a.length < 3) {
            setOptions([]);
            return;
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => onChange(a, (val) => {
            if (timeoutRef.current == timeoutIdRef.current) setOptions(val);
        }), 500);
        timeoutIdRef.current = timeoutRef.current;
    }, [onChange, setValue]);

    React.useEffect(() => { if (local) onChange("", setOptions) }, [value]);

    return (
        <div className="input-con-selector-container">
            <label htmlFor={label + 's'}>
                {label}
            </label>
            <div className='input-wrapper'>
                <div className='inputField'>
                    <input
                        type="text"
                        className='input-con-selector'
                        id={label + 's'}
                        value={value?.Name ?? ''}
                        onChange={e => debounce(e.target.value)}
                    />
                    <button onClick={() => setValue({ Name: '', id: '' })}>X</button>
                </div>
                <div className="contenedor-opciones">
                    <ul className="lista-opciones">
                        {options.length > 0 ? (
                            options.map(opcion => (
                                <li key={opcion.id} onClick={() => setValue(opcion)}>
                                    {opcion.Name}
                                </li>
                            ))
                        ) : <li>Sin opciones</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const TablaMedidores = ({ data, rowsSelected }: { data: modulRecord[], rowsSelected: (rows: modulRecord[]) => void }) => {
    const [selectedRows, setSelectedRows] = React.useState<modulRecord[]>([]);
    const [selectAll, setSelectAll] = React.useState(false);
    const [dataRows, setDataRows] = React.useState<modulRecord[]>(data);
    const filter = React.useContext(FilterContext);
    const idfilter = filter?.tipoContador?.id;

    React.useEffect(() => {
        setSelectAll(selectedRows.length === dataRows.length && dataRows.length > 0);
        setSelectedRows([]);
        setDataRows(data);
    }, [data, filter]);

    React.useEffect(() => {
        setSelectAll(selectedRows.length === dataRows.length && dataRows.length > 0);
        rowsSelected(selectedRows);
        console.log("THE REAL SELECTS: ", selectedRows);
    }, [selectedRows]);

    const includesRow = (row: modulRecord) => {
        return selectedRows.some(selected => selected.id === row.id);
    };

    const handleSelectAll = () => {
        setSelectAll(selAll => {
            setSelectedRows(selAll ? [] : dataRows
                .filter(a => !!a[idfilter ?? ""] && !!a[filter?.tipoContador?.numeroMedidor ?? ""])
                .map(a => ({ id: a.id, [idfilter ?? 'sin_data']: a[idfilter ?? ""] ?? '' } as modulRecord))
            );
            return !selAll
        });
    };

    return (
        <div className="table-container">
            <table className="tabla-medidores">
                <thead>
                    <tr>
                        <th>INMUEBLE</th>
                        <th>COMPRADOR PRINCIPAL</th>
                        <th>NÚMERO DE MEDIDOR</th>
                        <th>LECTURA DE MEDIDOR{!!filter?.tipoContador ? (" DE " + filter?.tipoContador.label) : ''}</th>
                        <th>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                />
                            </label>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {dataRows.length > 0 ? (
                        dataRows.map(row => (<Row row={row} selected={includesRow(row)} setSelectedRows={setSelectedRows} />))
                    ) : (
                        <tr>
                            <td colSpan={5}>No hay datos disponibles.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};


const Row = ({ row, selected, setSelectedRows }:
    { row: modulRecord, selected: boolean, setSelectedRows: (value: React.SetStateAction<modulRecord[]>) => void }) => {
    const filter = React.useContext(FilterContext);
    const idfilter = filter?.tipoContador?.id;
    const numeroMedidor = filter?.tipoContador?.numeroMedidor;
    const criteriaField = filter?.tipoContador?.criteriaField;
    const idFecha = filter?.tipoContador?.idFecha;

    const [dataRow, setDataRow] = React.useState<modulRecord>({} as modulRecord);


    const setDataRowA = () => {
        setDataRow({
            id: row.id,
            [idfilter ?? 'sin_data']: row[idfilter ?? ""] ?? '',
            [numeroMedidor ?? 'sin_data']: row[numeroMedidor ?? ""] ?? ''
        } as modulRecord)
    };

    React.useEffect(setDataRowA, [row]);

    // React.useEffect(() => {
    //     if (!idfilter || !numeroMedidor) return;
    //     setSelectedRows(prevSelected => {
    //         const exists = prevSelected.find(r => r.id === dataRow.id);
    //         const updated = prevSelected.map(r => r.id === dataRow.id ? { ...r, ...dataRow } : r);
    //         if (!exists) updated.push(dataRow);
    //         return updated.filter(r => !!r[idfilter] && !!r[numeroMedidor]);
    //     });
    // }, [dataRow]);

    const manageChange = (e: object) => {
        setDataRow(a => {
            const dataUpdate = { ...a, ...e };
            handleSelectRow(!!e[idfilter ?? numeroMedidor ?? 'pailas'], dataUpdate);
            return dataUpdate;
        });
    };


    const newDate = () => {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    };

    const handleSelectRow = (checked: boolean, dataAux?: modulRecord) => {
        if (!idfilter || !numeroMedidor) return;
        if (!dataAux) dataAux = dataRow;

        if (!dataAux[idfilter] || !dataAux[numeroMedidor]) return;
        const DATA: modulRecord = {
            id: dataAux.id,
            [idfilter ?? 'sin_data']: `${dataAux[idfilter ?? ""] ?? ''}`,
            [numeroMedidor ?? 'sin_data']: `${dataAux[numeroMedidor ?? ""] ?? ''}`,
            [idFecha ?? 'sin_data']: newDate()
        };
        if (!checked) setDataRowA();

        setSelectedRows(prevSelected =>
            prevSelected.find(row => row.id === DATA.id)
                ? prevSelected.filter(row => row.id !== DATA.id)
                : [...prevSelected, DATA]
        );
    };

    return (<tr
        key={dataRow.id}
        className={selected ? 'selected' : ''}
    >
        <td>{row.Inmueble?.name.toLocaleUpperCase() ?? 'Sin inmueble'}</td>
        <td>{row.Comprador_principal?.name.toLocaleUpperCase() ?? 'Sin propietario'}</td>
        <td>
            <Input id={numeroMedidor + 's'}
                value={`${dataRow[numeroMedidor ?? ''] ?? ''}`}
                onChange={e => manageChange({ [numeroMedidor ?? 'sin_data']: `${e}` })}
            />
        </td>
        <td>
            <Input id={idfilter + 's'}
                value={`${dataRow[idfilter ?? ''] ?? ''}`}
                onChange={e => manageChange({ [idfilter ?? 'sin_data']: `${e}`, [idFecha ?? 'sin_data']: newDate() })}
            />
        </td>
        <td>
            <input
                type="checkbox"
                checked={selected}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectRow(e.target.checked)}
            />
        </td>
    </tr>);
};


const Input = ({ id, value, onChange }: { id: string, value: string, onChange: (val: string) => void }) => {
    const [valueInput, setValue] = React.useState('');
    React.useEffect(() => setValue(value), [value]);
    const onChangeAction = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; //.replace(/[^0-9]/g, '');
        setValue(val);
        onChange(val);
    };
    return (
        <input
            type="text" className={valueInput ? 'input-number' : 'input-number_empty'}
            id={id} value={valueInput}
            onChange={onChangeAction}
        />
    );
}