import{ RestClient} from './RestClient';


test('1', () => {
    const x = new RestClient('http://pluto.heptet.us:7700/cme');
    return x.findTsType(1);
    })