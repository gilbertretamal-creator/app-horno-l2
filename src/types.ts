export interface InspectionData {
    date: string;
    technician: string;
    feed: string;
    rpm: string;
    migrationI: string;
    migrationII: string;
    migrationIII: string;
    migrationIV: string;
    tempI_TL: string; tempI_TR: string; tempI_BL: string; tempI_BR: string;
    tempII_TL: string; tempII_TR: string; tempII_BL: string; tempII_BR: string;
    tempIII_TL: string; tempIII_TR: string; tempIII_BL: string; tempIII_BR: string;
    tempIV_TL: string; tempIV_TR: string; tempIV_BL: string; tempIV_BR: string;
    innerI: string; innerII: string; innerIII: string; innerIV: string;
    andesI: string; andesII: string; andesIII: string; andesIV: string;
    pacificoI: string; pacificoII: string; pacificoIII: string; pacificoIV: string;
    empujeI_TL: string; empujeI_TR: string; empujeI_BL: string; empujeI_BR: string;
    empujeII_TL: string; empujeII_TR: string; empujeII_BL: string; empujeII_BR: string;
    empujeIII_TL: string; empujeIII_TR: string; empujeIII_BL: string; empujeIII_BR: string;
    empujeIV_TL: string; empujeIV_TR: string; empujeIV_BL: string; empujeIV_BR: string;
    observations: string;
}

export const initialData: InspectionData = {
    date: new Date().toISOString().split('T')[0],
    technician: '',
    feed: '',
    rpm: '',
    migrationI: '',
    migrationII: '',
    migrationIII: '',
    migrationIV: '',
    tempI_TL: '', tempI_TR: '', tempI_BL: '', tempI_BR: '',
    tempII_TL: '', tempII_TR: '', tempII_BL: '', tempII_BR: '',
    tempIII_TL: '', tempIII_TR: '', tempIII_BL: '', tempIII_BR: '',
    tempIV_TL: '', tempIV_TR: '', tempIV_BL: '', tempIV_BR: '',
    innerI: '', innerII: '', innerIII: '', innerIV: '',
    andesI: '', andesII: '', andesIII: '', andesIV: '',
    pacificoI: '', pacificoII: '', pacificoIII: '', pacificoIV: '',
    empujeI_TL: '', empujeI_TR: '', empujeI_BL: '', empujeI_BR: '',
    empujeII_TL: '', empujeII_TR: '', empujeII_BL: '', empujeII_BR: '',
    empujeIII_TL: '', empujeIII_TR: '', empujeIII_BL: '', empujeIII_BR: '',
    empujeIV_TL: '', empujeIV_TR: '', empujeIV_BL: '', empujeIV_BR: '',
    observations: '',
};
