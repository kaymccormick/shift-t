import{ RestClient} from './RestClient';


test('1', () => {
    const x = new RestClient('http://127.0.0.1:7700/cme');
    return x.findTsType(1);
})