import React, { Component } from 'react';
import { connect } from 'react-redux'
import PropTypes from 'prop-types';
import { Actions, prepareLayer } from 'gisida'

const mapStateToProps = (state, ownProps) => {
  return {
  }
}

class Layer extends Component {

  onLayerToggle = (e, layer) => {
    const dispatch = this.props.dispatch;
    
    // dispatch toggle layer 
    dispatch(Actions.toggleLayer(layer.id, e.target.checked));

    // dispach prepare layer if layer data has not been loaded into props
    if (!layer.loaded && !layer.isLoading) {
      prepareLayer(layer, dispatch);
    }
  }

  render() {
    const layer = this.props.layer;

    return (
      <li className="layer">
        <input
          type="checkbox"
          data-layer={layer.id}
          onChange={e => this.onLayerToggle(e, layer)}
          checked={!!layer.visible}
        />
        <label htmlFor={layer.id} >{layer.label}</label>
      </li>
    );
  }
}

Layer.propTypes = {
  layer: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default connect(mapStateToProps)(Layer);
