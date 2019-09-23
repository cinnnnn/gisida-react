import React from 'react';
import { DetailView }  from '../../../../src/lib/components/DetailView/DetailView.js'
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';

//declare certain variables
const componentWrapper = shallow(
	//no propTypes, so no vals?
	<DetailView />
);

describe('DetailView', () => {
	it('DetailView component renders correctly', () => {
		const json = toJson(componentWrapper)
		expect(json).toMatchSnapshot();
	})
});