const enum_ = {}
enum_.sequences = ['arabic', 'loweralpha', 'upperalpha',
                   'lowerroman', 'upperroman'];

enum_.sequencepats = {
    arabic: '[0-9]+',
    loweralpha: '[a-z]',
    upperalpha: '[A-Z]',
    lowerroman: '[ivxlcdm]+',
    upperroman: '[IVXLCDM]+',
};

enum_.sequenceregexps = {};
enum_.sequences.forEach((sequence) => {
    enum_.sequenceregexps[sequence] = new RegExp(`${enum_.sequencepats[sequence]}$`);
});
