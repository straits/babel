
const traits = {
	notImplemented: Symbol()
};
use traits * from traits;

label: {
	/* eslint-disable no-unreachable */
	break label;
	5.*notImplemented();
}
