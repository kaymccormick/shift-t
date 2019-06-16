class A {
    constructor() {
    }
    
    method1() {
        return "foo";
    }
}

class B extends A {
    constructor() {
        super();
    }
    
    method1() {
        const r = super.method1();
        return "bar";
    }
}
export { A, B };
