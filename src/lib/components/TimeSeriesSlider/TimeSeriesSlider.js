import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux'
import { Actions, getSliderLayers} from 'gisida';

require('./TimeSeriesSlider.scss');

const mapStateToProps = (state, ownProps) => {  
  return {  
    mapId: '01',
    timeSeriesObj: state.MAP.timeseries[state.MAP.visibleLayerId],
    timeseries: state.MAP.timeseries,
    layers: state.MAP.layers
  }
}

class TimeSeriesSlider extends React.Component {
  constructor(props) {
    super(props);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }


  updateTimeseriesState(nextIndex, sliderLayerObj) {
    let nextTimeseriesLayer;
    let layerId;
    let temporalIndex;
    let stops;
    let period;
    const nextTimeseries = Object.assign({}, this.props.timeseries);

    const timeSeriesLayers = getSliderLayers(this.props.layers);
    
    const activeLayers = [];
    const layers = [];
    const loadedlayers = this.props.layers;
    Object.keys(loadedlayers).forEach((key) => {
      if (loadedlayers[key].visible) {
        activeLayers.push(loadedlayers[key].id);
        layers.push(loadedlayers[key]);
      }
    });

    const stopsFilter = d => d[stops.timefield] === period[temporalIndex];

    for (let i = 0; i < timeSeriesLayers.length; i += 1) {
      layerId = timeSeriesLayers[i];
      if (activeLayers.includes(layerId) && nextTimeseries[layerId]) {
        nextTimeseriesLayer = nextTimeseries[layerId];
        const { layerObj, periodData } = nextTimeseriesLayer;
        stops = nextTimeseriesLayer.stops;
        period = nextTimeseriesLayer.period;

        if (layerId === sliderLayerObj.layerId) {
          temporalIndex = nextIndex;
        } else {
          temporalIndex = period.indexOf(sliderLayerObj.period[nextIndex]);
        }

        if (temporalIndex !== -1) {
          nextTimeseries[layerId] = Object.assign(
            {},
            nextTimeseriesLayer,
            {
              temporalIndex,
              data: (layerObj.type === 'chart')
                ? stops.filter(stopsFilter)
                : periodData[period[temporalIndex]].data,
            },
          );
        }
      }
    }

    this.props.dispatch(Actions.updateTimeseries(nextTimeseries))
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.timeSeriesObj) {
      const { period, temporalIndex } = nextProps.timeSeriesObj;
      this.setState({
        periods: period,
        index: temporalIndex,
        period: period[temporalIndex],
      });
      
    }
  }

  handleMouseUp(e) {
    const nextIndex = parseInt(e.target.value, 10);
    const { index } = this.state;

    if (nextIndex !== index) {
      this.updateTimeseriesState(e.target.value, this.props.timeSeriesObj);
    }
  }

  render() {
    return (
      <div>
        {(this.props.timeSeriesObj) ?
          <div className="series">
            <label
              id={`${this.props.mapId}-label`}
              className="label"
              htmlFor="slider"
            >{this.state.period}</label>
            <input
              id={`${this.props.mapId}-slider`}
              className="slider"
              type="range"
              list={`${this.props.mapId}-datalist`}
              max={this.state.periods.length - 1}
              value={this.state.index}
              onInput={(e) => { this.handleMouseUp(e); }}
              data-html2canvas-ignore
            />
            <datalist id={`${this.props.mapId}-datalist`}>
              {this.state.periods.map((p, i) => <option key={i}>{i}</option>)}
            </datalist>
          </div> : ''}
      </div>
    );
  }
}

TimeSeriesSlider.propTypes = {
  mapId: PropTypes.string.isRequired,
  timeSeriesObj: PropTypes.objectOf(PropTypes.any),
  updateTimeseriesState: PropTypes.func.isRequired,
};

export default connect(mapStateToProps)(TimeSeriesSlider);
