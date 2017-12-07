import React from 'react';
import PropTypes from 'prop-types';

const Layer = ({ mapTargetId, layer, onLayerChange = f => f }) =>
  (<li className={`layer ${mapTargetId}`}>
    <input
      type="checkbox"
      data-layer={layer.name}
      onChange={e => onLayerChange(layer, e.target.checked, mapTargetId)}
    />
    <label htmlFor={layer.name} >{layer.label}</label>
  </li>);

Layer.propTypes = {
  mapTargetId: PropTypes.string.isRequired,
  layer: PropTypes.arrayOf(PropTypes.any).isRequired,
  onLayerChange: PropTypes.func.isRequired,
};

export default Layer;
