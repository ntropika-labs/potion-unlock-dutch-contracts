import { useCallback, useState } from 'react';

import { withGlobalState } from 'react-globally';
import useSimpleIncrement from '../../hooks/useSimpleIncrement';
import useSimpleIncrementBy from '../../hooks/useSimpleIncrementBy';
import useSimpleValue from '../../hooks/useSimpleValue';

const SimpleContract: React.FC<any> = (props) => {
  const value = useSimpleValue();
  const { onIncrement } = useSimpleIncrement(props);
  const { onIncrementBy } = useSimpleIncrementBy(props);

  const [ incrementByValue, setIncrementByValue ] = useState('');
  const handleIncrementByValueChange = useCallback((event) => {
    setIncrementByValue(event.target.value);
  }, [setIncrementByValue]);

  const handleIncrementBySend = useCallback(() => {
    onIncrementBy(incrementByValue);
  }, [onIncrementBy, incrementByValue]);

  return (
    <div className="main">
      <div className="container">
        <h1>Simple Contract</h1>
        <br/>
        <div className="row">
          <div className="col-sm-12">
            <p>Value: <b>{value?.toString()}</b></p>
            <button type="button" className="btn btn-primary" onClick={onIncrement}>Increment</button>
            <div className="form-group">
              <label htmlFor="deposit">Value</label>
              <input type="string" className="form-control" id="deposit" onChange={handleIncrementByValueChange}/>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleIncrementBySend}>Add Increment</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withGlobalState(SimpleContract);