import React from 'react';
import PropTypes from 'prop-types';
import SumPieChart from './SumPieChart';
import SumColumnChart from './SumColumnChart';
import SumChartMinimize from './SumChartMinimize';
import { connect } from 'react-redux'

require('./SummaryChart.scss');


const mapStateToProps = (state, ownProps) => {

  const layers = state.MAP.layers;
  let layerObj
  let layersObj = []
  let currentRegion
  let sumChartObj;
  let isChartMin;
  let legendBottom;  
  // Get visible layer 
  Object.keys(layers).forEach((key) => {
    const layer = layers[key];
    if (layer.charts && layer.visible) {
      layerObj = layer;
      layersObj.push(layerObj);
    } 
  });

  // Set layer to undefined of layer is from diffrent region
  currentRegion = state.REGIONS.filter(region => region.current)[0];
  if (currentRegion) {
    layerObj = (layerObj && layerObj.region === currentRegion.name) ? layerObj : undefined;
  } 

  if (layerObj && layerObj.charts) {
   
    // TODO: add timeseries suppport
    if (typeof layerObj.isChartMin === 'undefined') {
      console.log('lug down men')
      layerObj.isChartMin = true;
      layerObj.legendBottom = 40;
    }
  }

  if (layerObj && layerObj.charts) {
    return {
      layerId: layerObj.id,
      layer: layerObj,
      layersObj: layersObj,
      mapId: "01",
      isChartMin: layerObj.isChartMin,
      legendBottom: layerObj.legendBottom,
      locations: {},
      showMinimize: true
    }
  } else return { showMinimize: false}
}

class SummaryChart extends React.Component {
  static defineCharts(chartSpec) {
    const chartKeys = Object.keys(chartSpec);
    const charts = [];
    let primaryChart = null;

    for (let c = 0; c < chartKeys.length; c += 1) {
      if (chartKeys[c] === 'primary') {
        primaryChart = chartSpec[chartKeys[c]];
      } else if (chartSpec[chartKeys[c]] instanceof Array) {
        for (let i = 0; i < chartSpec[chartKeys[c]].length; i += 1) {
          charts.push({
            type: chartKeys[c],
            spec: chartSpec[chartKeys[c]][i],
          });
        }
      } else {
        charts.push({
          type: chartKeys[c],
          spec: chartSpec[chartKeys[c]],
        });
      }
    }

    // todo - add array.sort according to order prop set in MapSpec

    return { charts, primaryChart };
  }

  static calcChartWidth(sectorsId) {
    const windowWidth = $(window).outerWidth();
    const $sectors = $(`#${sectorsId} .sectors-menu`);
    const sectorsMenuWidth = $sectors.css('display') === 'block' ? $sectors.outerWidth() : 0;
    const menuIsFixedLeft = $(window).outerHeight() === $('#menu').outerHeight() &&
      !$('#menu').offset().top && !$('#menu').offset().left;
    const menuWidth = (menuIsFixedLeft ? $('#menu').outerWidth() : 0) + 20;
    const availbleWidth = windowWidth - sectorsMenuWidth - menuWidth;
    const minChartWidth = 650;
    const legendWidth = availbleWidth >= minChartWidth ? 340 : 0;

    return {
      chartWidth: availbleWidth - legendWidth,
      isFullBleed: !(availbleWidth >= minChartWidth),
    };
  }

  static calcLegendPosition(mapId) {
    const $legend = $(`.legend.${mapId}`);
    const legendHeight = $('.legend-row.primary', $legend).innerHeight(); // bottom of 40
    const legendBottom = $legend.innerHeight() - legendHeight + 40 + 12; // padding of 12

    return {
      height: legendHeight + 40,
      bottom: legendBottom,
    };
  }

  saveChartState(layerId, isChartMin, legendBottom) {
    const { layerObj, layersObj } = this.state;
    const newLayersObj = [];
    let doUpdateLayersObj = false;

    if (layerObj.id === layerId && layerObj.isChartMin !== isChartMin) {
      layerObj.isChartMin = isChartMin;
      layerObj.legendBottom = legendBottom;
      layersObj[layersObj.length - 1].isChartMin = isChartMin;
      layersObj[layersObj.length - 1].legendBottom = legendBottom;

      this.setState({
        layerObj,
        layersObj,
      });
    } else {
      for (let lo = 0; lo < layersObj.length; lo += 1) {
        if (layersObj[lo].id === layerId && layersObj[lo].isChartMin !== isChartMin) {
          layersObj[lo].isChartMin = isChartMin;
          layersObj[lo].legendBottom = legendBottom;
          doUpdateLayersObj = true;
        }
        newLayersObj.push(layersObj[lo]);
      }
    }

    if (doUpdateLayersObj) {
      this.setState({
        layersObj: newLayersObj,
      });
    }
  }

  constructor(props) {
    super(props);
    if (Object.keys(this.props).length > 2) {
      const { layerId, layer, mapId, isChartMin, legendBottom, locations } = this.props;
      const locationMap = {};
      const locationKeys = Object.keys(locations);
      for (let l = 0; l < locationKeys.length; l += 1) {
        locationMap[locations[locationKeys[l]]] = locationKeys[l];
      }

      const legendPosition = SummaryChart.calcLegendPosition(mapId);
      const chartSpecs = SummaryChart.defineCharts(layer.charts);
      const primaryChartPosition = chartSpecs && !chartSpecs.primaryChart
        ? { chartWidth: 0, isFullBleed: false }
        : SummaryChart.calcChartWidth(`sector-menu-${mapId.replace('map-', '')}-wrapper`);

      $(`.legend.${this.props.mapId}`).css('bottom', legendBottom);
  
      this.state = {
        layerId,
        layer,
        chartHeight: legendPosition.height,
        buttonBottom: legendPosition.bottom,
        isChartMin,
        doShowModal: false,
        layerData: layer.layerObj ? layer.data : layer.mergedData,
        charts: chartSpecs.charts,
        primaryChart: chartSpecs.primaryChart,
        chartWidth: primaryChartPosition.chartWidth,
        isFullBleed: primaryChartPosition.isFullBleed,
        locations: locationMap,
      };
    }

      this.moveMapLedgend = this.moveMapLedgend.bind(this);
      this.onOpenModalClick = this.onOpenModalClick.bind(this);
      this.onCloseModalClick = this.onCloseModalClick.bind(this);
      this.toggleChart = this.toggleChart.bind(this);

  }

  componentWillReceiveProps(nextProps) {
    if (Object.keys(nextProps).length > 2) {
      const { layerId, layer, mapId, isChartMin, legendBottom } = nextProps;
      const legendPosition = SummaryChart.calcLegendPosition(mapId);
      const chartSpecs = SummaryChart.defineCharts(layer.charts);
      const primaryChartPosition = chartSpecs && !chartSpecs.primaryChart
        ? { chartWidth: 0, isFullBleed: false }
        : SummaryChart.calcChartWidth(`sector-menu-${mapId.replace('map-', '')}-wrapper`);

      $(`.legend.${this.props.mapId}`).css('bottom', legendBottom);

      this.setState({
        layersObj: nextProps.layersObj,
        layerObj: layer,
        layerId,
        layer,
        chartHeight: legendPosition.height,
        buttonBottom: legendPosition.bottom,
        layerData: layer.layerObj ? layer.data : layer.mergedData,
        charts: chartSpecs.charts,
        primaryChart: chartSpecs.primaryChart,
        isChartMin,
        doShowModal: layerId === this.state && this.state.layerId ? this.state.doShowModal : false,
        chartWidth: primaryChartPosition.chartWidth,
        isFullBleed: primaryChartPosition.isFullBleed,
      });
    }
  }

  onOpenModalClick(e) {
    if (e) e.preventDefault();
    this.setState({ doShowModal: !this.state.doShowModal });
  }

  onCloseModalClick(e) {
    e.preventDefault();
    this.setState({ doShowModal: false });
  }

  moveMapLedgend() {
    const { isChartMin } = this.state;
    const sectorsId = `sector-menu-${this.props.mapId.replace('map-', '')}-wrapper`;
    const legendPosition = SummaryChart.calcLegendPosition(this.props.mapId);
    const primaryChartPosition = SummaryChart.calcChartWidth(sectorsId);
    const legendBottom = !isChartMin ? primaryChartPosition.isFullBleed
      ? legendPosition.height + 20 : 40 : 40;

    $(`.legend.${this.props.mapId}`).css('bottom', legendBottom);
    this.setState({
      buttonBottom: legendBottom + 12,
      chartWidth: primaryChartPosition.chartWidth,
      isFullBleed: primaryChartPosition.isFullBleed,
    }, () => {
      this.saveChartState(this.props.layerId, this.state.isChartMin, legendBottom);
    });
  }

  toggleChart() {
    const { isChartMin, primaryChart } = this.state;
    if (primaryChart) {
      this.setState({
        isChartMin: !isChartMin,
        doShowModal: false,
      }, () => {
        this.moveMapLedgend();
      });
    } else {
      this.onOpenModalClick();
    }
  }

  render() {
    if (this.state && Object.keys(this.state).length > 2 && this.props.showMinimize) {
    const { layerId, layerData, layer, charts, primaryChart, locations } = this.state;
    const { doShowModal, chartHeight, buttonBottom, isFullBleed, chartWidth } = this.state;
    let chartKey = '';
    const sumCharts = [];
    let primarySumChart = null;
    let c;

    for (c = 0; c < charts.length; c += 1) {
      chartKey = `${charts[c].type}-${c}`;
      switch (charts[c].type) {
        case 'pie':
          sumCharts.push((
            <SumPieChart
              key={chartKey}
              layerId={layerId}
              layer={layer}
              layerData={layerData}
              chartSpec={charts[c].spec}
              mapId={this.props.mapId}
            />
          ));
          break;
        case 'column':
          sumCharts.push((<SumColumnChart
            key={chartKey}
            layer={layer}
            layerId={layerId}
            layerData={layerData}
            mapId={this.props.mapId}
            chartSpec={charts[c].spec}
            isPrimary={false}
            locations={locations}
          />));
          break;
        default:
          console.error(`Unexpected type of summary chart: ${charts[c].type}`);
          break;
      }
    }

    if (primaryChart) {
      const primaryChartHeight = chartHeight >= 141 ? chartHeight : 141;
      switch (primaryChart.type) {
        case 'column':
        default:
          primarySumChart = (
            <SumColumnChart
              layerId={layerId}
              layer={layer}
              layerData={layerData}
              mapId={this.props.mapId}
              chartSpec={primaryChart.spec}
              moveMapLedgend={this.moveMapLedgend}
              onOpenModalClick={this.onOpenModalClick}
              doShowModal={doShowModal}
              saveChartState={this.saveChartState}
              isChartMin={this.state.isChartMin}
              chartHeight={primaryChartHeight}
              chartWidth={chartWidth}
              isFullBleed={isFullBleed}
              calcChartWidth={SummaryChart.calcChartWidth}
              locations={locations}
              isPrimary
            >
              {sumCharts.length ? (
                <button
                  className={`toggleBtn glyphicon glyphicon-${
                    doShowModal ? 'resize-small isOpen' : 'option-horizontal'}`}
                  onClick={(e) => { this.onOpenModalClick(e); }}
                  alt="More Summary Charts"
                  title="More Summary Charts"
                />
              ) : null}
            </SumColumnChart>
          );
          break;
      }
    }

    return (
      <div>
        <SumChartMinimize toggleChart={this.toggleChart} bottom={buttonBottom} />
        {!this.state.isChartMin && primarySumChart ? primarySumChart : ''}
        {doShowModal && sumCharts.length ? (
          <div className={`sumChartModal ${this.props.mapId}`}>
            <div className="sumChartModalHeader">
              <h4>{this.state.layer.label || this.state.layer.layerObj.label}</h4>
              <span
                role="button"
                className={'glyphicon glyphicon-remove closeBtn'}
                onClick={(e) => { this.onCloseModalClick(e); }}
                tabIndex={-1}
              />
            </div>
            <div className="sumChartModalBody">
              {sumCharts}
            </div>
          </div>
        ) : ''}
        {doShowModal && sumCharts.length ?
          <div
            className="sumChartsOverlay"
            role="button"
            onClick={(e) => { this.onCloseModalClick(e); }}
            tabIndex={-1}
          />
          : ''}
      </div>
    );
  } return (<div/>)
}
}

SummaryChart.propTypes = {
  layer: PropTypes.objectOf(PropTypes.any).isRequired,
  locations: PropTypes.objectOf(PropTypes.any).isRequired,
  layerId: PropTypes.string.isRequired,
  mapId: PropTypes.string.isRequired,
  saveChartState: PropTypes.func.isRequired,
  isChartMin: PropTypes.bool.isRequired,
  legendBottom: PropTypes.number.isRequired,
};

export default connect(mapStateToProps)(SummaryChart);

