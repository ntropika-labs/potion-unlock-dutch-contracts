import { useCallback, useState } from 'react';

import { withGlobalState } from 'react-globally';
import useMetamaskEncrypt from '../../hooks/useMetamaskEncrypt';

const Encrypt: React.FC<any> = (props) => {
  const { encryptedMessage, onEncrypt } = useMetamaskEncrypt(props);

  const [ plaintext, setPlaintext ] = useState('');
  const handlePlaintextChange = useCallback((event) => {
    setPlaintext(event.target.value);
  }, [setPlaintext]);
  
  const [ key, setKey ] = useState('');
  const handleKeyChange = useCallback((event) => {
    setKey(event.target.value);
  }, [setKey]);

  const handleEncrypt = useCallback(() => {
    onEncrypt(plaintext, key);
  }, [onEncrypt, plaintext, key]);

  const myText = {
      width: '200px',
      'wrap-word': 'break-word'
  };
  return (
    <div className="main">
      <div className="container">
        <h1>Encrypt with Metamask</h1>
        <br/>
        <div className="row">
          <div className="col-sm-12">
            <div className="form-group">
              <label htmlFor="key">Public Key</label>
              <input type="string" className="form-control" id="key" onChange={handleKeyChange}/>
              <label htmlFor="encrypt">Message</label>
              <input type="string" className="form-control" id="encrypt" onChange={handlePlaintextChange}/>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleEncrypt}>Encrypt</button>
            <div style={myText}>
              Encrypted message: {encryptedMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withGlobalState(Encrypt);